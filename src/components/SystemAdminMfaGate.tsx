import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase, isPasswordSetupPending } from '../lib/supabase';
import './systemAdminMfaGate.css';

type GateState =
  | { kind: 'checking' }
  | { kind: 'enroll'; factorId: string; qrCode: string; uri: string; secret: string }
  | { kind: 'challenge'; factorId: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

export default function SystemAdminMfaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: 'checking' });
  const [code, setCode] = useState('');
  const codeInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const inspectionInFlight = useRef(false);
  const lastInspectedUserId = useRef<string | null>(null);
  const pendingBootstrap = useRef(false);
  const pendingInvitation = useRef(false);

  const inspect = useCallback(async () => {
    // Verified invitation/email setup must reach the original password form
    // before this existing authenticator gate runs.
    if (isPasswordSetupPending()) {
      setState({ kind: 'ready' });
      return;
    }
    setState({ kind: 'checking' });
    setMessage('');
    const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setState({ kind: 'error', message: sessionError.message });
      return;
    }
    const user = sessionResult.session?.user;
    lastInspectedUserId.current = user?.id ?? null;
    if (!user) {
      setState({ kind: 'ready' });
      return;
    }

    // getSession() only reads local storage. Password activation can invalidate
    // the invitation token, so validate it against Auth before calling RPCs.
    const { data: verifiedIdentity, error: identityError } = await supabase.auth.getUser();
    if (identityError) {
      if (identityError.status === 401 || identityError.status === 403 ||
          /auth session missing|invalid jwt|token has expired/i.test(identityError.message)) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // The local sign-in screen is still the correct recovery path.
        }
        lastInspectedUserId.current = null;
        setState({ kind: 'ready' });
        return;
      }
      setState({ kind: 'error', message: identityError.message });
      return;
    }
    // Use the current Web2Table platform authorization APIs. The private
    // first-admin invitation permits MFA enrollment only; it does not grant
    // access to restaurant data before the verified AAL2 bootstrap claim.
    const { data: adminEligible, error: adminError } = await supabase.rpc(
      'privileged_route_eligible', { p_workspace: 'admin' },
    );
    if (adminError) {
      setState({ kind: 'error', message: adminError.message });
      return;
    }
    let candidate = false;
    let invitedAdministrator = false;
    if (adminEligible !== true) {
      const { data: bootstrapEligible, error: bootstrapError } =
        await supabase.rpc('is_initial_admin_bootstrap_candidate');
      if (bootstrapError) {
        setState({ kind: 'error', message: bootstrapError.message });
        return;
      }
      candidate = bootstrapEligible === true;

      if (!candidate) {
        const { data: inviteEligible, error: inviteError } =
          await supabase.rpc('is_system_admin_invitation_candidate');
        if (inviteError) {
          setState({ kind: 'error', message: inviteError.message });
          return;
        }
        invitedAdministrator = inviteEligible === true;
      }

      if (!candidate && !invitedAdministrator) {
        pendingBootstrap.current = false;
        pendingInvitation.current = false;
        setState({ kind: 'ready' });
        return;
      }
    }
    pendingBootstrap.current = candidate;
    pendingInvitation.current = invitedAdministrator;

    const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] =
      await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
    if (assuranceError || factorsError) {
      setState({ kind: 'error', message: assuranceError?.message ?? factorsError?.message ?? 'Unable to check MFA status.' });
      return;
    }
    if (assurance.currentLevel === 'aal2') {
      if (candidate) {
        const { data: claimed, error: claimError } =
          await supabase.rpc('claim_initial_admin_bootstrap');
        if (claimError || claimed !== true) {
          setState({ kind: 'error', message: claimError?.message ?? 'Unable to activate the approved administrator.' });
          return;
        }
        pendingBootstrap.current = false;
      } else if (invitedAdministrator) {
        const { data: claimed, error: claimError } =
          await supabase.rpc('claim_system_admin_invitation');
        if (claimError || claimed !== true) {
          setState({ kind: 'error', message: claimError?.message ?? 'Unable to activate the invited administrator.' });
          return;
        }
        pendingInvitation.current = false;
      }
      setState({ kind: 'ready' });
      return;
    }

    const verified = factors.totp.find((factor) => factor.status === 'verified');
    if (verified) {
      try { window.sessionStorage.removeItem(`web2table.pending-admin-mfa.v1:${(await supabase.auth.getUser()).data.user?.id ?? ''}`); } catch { /* best effort */ }
      setState({ kind: 'challenge', factorId: verified.id });
      return;
    }

    const currentUser = (await supabase.auth.getUser()).data.user;
    const storageKey = `web2table.pending-admin-mfa.v1:${currentUser?.id ?? ''}`;
    const pendingFactors = factors.totp.filter((factor) => factor.status !== 'verified');
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { factorId?: string; qrCode?: string; uri?: string; secret?: string; expiresAt?: number };
        if (saved.expiresAt && saved.expiresAt > Date.now() && pendingFactors.some((factor) => factor.id === saved.factorId)
          && saved.factorId && saved.qrCode && saved.uri && saved.secret) {
          setState({ kind: 'enroll', factorId: saved.factorId, qrCode: saved.qrCode, uri: saved.uri, secret: saved.secret });
          return;
        }
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      setState({ kind: 'error', message: 'Unable to restore the pending authenticator setup in this browser tab. Do not scan an older QR code; restart setup explicitly.' });
      return;
    }
    if (pendingFactors.length > 0) {
      setState({ kind: 'error', message: 'An unfinished authenticator setup already exists but its original QR code is unavailable in this tab. Restart the incomplete setup before creating a new QR code.' });
      return;
    }
    const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Web2Table System Admin ${new Date().toISOString().replace(/[:.]/g, '-')}`,
    });
    if (enrollmentError) {
      setState({ kind: 'error', message: enrollmentError.message });
      return;
    }
    const nextState = { kind: 'enroll' as const, factorId: enrollment.id, qrCode: enrollment.totp.qr_code, uri: enrollment.totp.uri, secret: enrollment.totp.secret };
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ ...nextState, expiresAt: Date.now() + 30 * 60 * 1000 }));
    } catch {
      await supabase.auth.mfa.unenroll({ factorId: enrollment.id });
      setState({ kind: 'error', message: 'This browser cannot retain the pending authenticator setup. Enable session storage and retry.' });
      return;
    }
    setState(nextState);
  }, []);

  useEffect(() => {
    // Run once per mount. Re-running on every auth/token event can race MFA
    // enrollment and leave the gate repeatedly returning to "checking".
    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (active) {
        setState({
          kind: 'error',
          message: 'The security check is taking too long. Please refresh the page. If this continues, sign out and sign in again, then retry.',
        });
      }
    }, 12000);
    const runInspection = () => {
      // Prevent overlapping checks from racing each other and flashing the UI.
      if (!active || inspectionInFlight.current) return;
      inspectionInFlight.current = true;
      void inspect().catch((error) => {
        if (active) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'The security check failed unexpectedly. Please retry.',
          });
        }
      }).finally(() => {
        inspectionInFlight.current = false;
        window.clearTimeout(timeoutId);
      });
    };

    // Subscribe before the initial inspection so a login during page startup
    // cannot be missed. Ignore duplicate SIGNED_IN events for the same user.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        lastInspectedUserId.current = null;
        setCode('');
        setMessage('');
        setState({ kind: 'ready' });
        return;
      }
      if (event !== 'SIGNED_IN' || !session?.user) return;
      if (isPasswordSetupPending()) {
        setState({ kind: 'ready' });
        return;
      }
      if (lastInspectedUserId.current === session.user.id || inspectionInFlight.current) return;
      setState({ kind: 'checking' });
      window.setTimeout(() => {
        if (active) runInspection();
      }, 0);
    });

    const handleAdminAccessActivated = () => {
      if (!active) return;
      setState({ kind: 'checking' });
      // The invitation activation RPC changes the database access record
      // without emitting a Supabase auth event. Re-check MFA immediately.
      window.setTimeout(() => {
        if (active) runInspection();
      }, 0);
    };
    window.addEventListener('system-admin-access-activated', handleAdminAccessActivated);

    runInspection();

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('system-admin-access-activated', handleAdminAccessActivated);
      window.clearTimeout(timeoutId);
    };
  }, [inspect]);

  useEffect(() => {
    if (state.kind === 'enroll' || state.kind === 'challenge') codeInput.current?.focus();
  }, [state.kind]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (state.kind !== 'enroll' && state.kind !== 'challenge') return;
    setBusy(true);
    setMessage('');
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: state.factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: state.factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel !== 'aal2') {
        throw new Error('MFA was verified, but this session has not reached AAL2. Please try again.');
      }
      // A verified MFA token is necessary but not sufficient. The database
      // performs the one-time first-admin claim only for the explicitly
      // approved, email-verified candidate.
      if (pendingBootstrap.current) {
        const { data: claimed, error: claimError } =
          await supabase.rpc('claim_initial_admin_bootstrap');
        if (claimError) throw claimError;
        if (claimed !== true) throw new Error('Administrator activation was not confirmed.');
        pendingBootstrap.current = false;
      } else if (pendingInvitation.current) {
        const { data: claimed, error: claimError } =
          await supabase.rpc('claim_system_admin_invitation');
        if (claimError) throw claimError;
        if (claimed !== true) throw new Error('Invited administrator activation was not confirmed.');
        pendingInvitation.current = false;
      }
      const { data: verifiedUser } = await supabase.auth.getUser();
      if (verifiedUser.user) {
        try { window.sessionStorage.removeItem(`web2table.pending-admin-mfa.v1:${verifiedUser.user.id}`); } catch { /* best effort */ }
      }
      setCode('');
      setState({ kind: 'ready' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to verify the authenticator code.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCode('');
      setRecoveryPassword('');
      setShowRecovery(false);
      setState({ kind: 'ready' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign out. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resetAuthenticator(event: React.FormEvent) {
    event.preventDefault();
    if (!recoveryPassword) {
      setMessage('Enter your current System Admin password to authorize the reset.');
      return;
    }
    const confirmed = window.confirm(
      'Reset your System Admin authenticator? This removes only your verified TOTP factor and signs you out. You must sign in again and set up a new authenticator before entering the dashboard.',
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('system-admin-reset-own-totp', {
        body: { password: recoveryPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecoveryPassword('');
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authenticator recovery failed. No changes were confirmed.');
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'ready') return <>{children}</>;
  if (state.kind === 'checking') {
    return <main className="system-admin-mfa-screen"><section className="system-admin-mfa-card"><h1>Checking account security</h1><p>Verifying your System Admin MFA status…</p></section></main>;
  }
  if (state.kind === 'error') {
    return <main className="system-admin-mfa-screen"><section className="system-admin-mfa-card"><h1>MFA setup unavailable</h1><p>{state.message}</p><button type="button" onClick={() => void inspect()}>Try again</button></section></main>;
  }

  const enrolling = state.kind === 'enroll';
  return (
    <main className="system-admin-mfa-screen">
      <section className="system-admin-mfa-card" aria-labelledby="mfa-title">
        <h1 id="mfa-title">{enrolling ? 'Secure your System Admin account' : 'Verify your identity'}</h1>
        <p className="system-admin-mfa-description">{enrolling
          ? 'Scan this QR code with an authenticator app, then enter the six-digit code to finish setup.'
          : 'Your authenticator is already set up. Enter its current six-digit code to continue to your workspace.'}</p>
        {enrolling && (
          <div className="system-admin-mfa-enrollment">
            <img src={state.qrCode} alt="Authenticator enrollment QR code" />
            <details>
              <summary>Can't scan the QR code? Set up manually</summary>
              <p>In your authenticator app, choose the option to enter a setup key manually. Enter this secret key:</p>
              <code style={{ display: 'block', overflowWrap: 'anywhere', userSelect: 'all', padding: '10px' }}>{state.secret}</code>
              <button type="button" className="secondary-button" onClick={() => void navigator.clipboard.writeText(state.secret).then(() => setMessage('Setup key copied.')).catch(() => setMessage('Select and copy the setup key above.'))}>Copy setup key</button>
              <p>Account: your System Admin email. Type: time-based (TOTP).</p>
            </details>
          </div>
        )}
        <form className="system-admin-mfa-form" onSubmit={verify}>
          <label htmlFor="system-admin-mfa-code">Authenticator code</label>
          <div className="system-admin-mfa-code-wrap">
            <div className="system-admin-mfa-code-cells" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span className={index === code.length ? 'is-current' : ''} key={index}>{code[index] ?? ''}</span>)}</div>
            <input ref={codeInput} id="system-admin-mfa-code" className="system-admin-mfa-code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </div>
          <p className="system-admin-mfa-hint">Enter the 6-digit code from your authenticator app.</p>
          {message && <p role="alert" className="system-admin-mfa-error">{message}</p>}
          <button className="system-admin-mfa-primary" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify authenticator'}</button>
        </form>
        <button className="system-admin-mfa-secondary" type="button" onClick={() => void signOut()} disabled={busy}>Sign out</button>
        {state.kind === 'challenge' && (
          <section className="system-admin-mfa-recovery" aria-label="Authenticator recovery">
            {showRecovery ? (
              <p className="system-admin-mfa-recovery-copy">
                Lost your authenticator?{' '}
                <button type="button" className="system-admin-mfa-recovery-link" disabled={busy} onClick={() => { setShowRecovery(false); setMessage(''); }}>Cancel reset</button>
              </p>
            ) : (
              <p className="system-admin-mfa-recovery-copy">
                Lost your authenticator?{' '}
                <button type="button" className="system-admin-mfa-recovery-link" disabled={busy} onClick={() => { setShowRecovery(true); setMessage(''); }}>Reset it</button>
              </p>
            )}
            {showRecovery && (
              <form className="system-admin-mfa-recovery-form" onSubmit={resetAuthenticator}>
                <p>Reset only your own authenticator. You’ll be signed out and must enroll a new authenticator before the dashboard unlocks.</p>
                <label htmlFor="system-admin-recovery-password">Current System Admin password</label>
                <input id="system-admin-recovery-password" type="password" autoComplete="current-password" value={recoveryPassword} onChange={(event) => setRecoveryPassword(event.target.value)} required />
                {message && <p role="alert" className="system-admin-mfa-error">{message}</p>}
                <button className="system-admin-mfa-primary" type="submit" disabled={busy || !recoveryPassword}>{busy ? 'Resetting…' : 'Confirm reset'}</button>
              </form>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
