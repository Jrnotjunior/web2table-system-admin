import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type GateState =
  | { kind: 'checking' }
  | { kind: 'enroll'; factorId: string; qrCode: string; uri: string; secret: string }
  | { kind: 'challenge'; factorId: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

export default function SystemAdminMfaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: 'checking' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inspectionInFlight = useRef(false);
  const lastInspectedUserId = useRef<string | null>(null);

  const inspect = useCallback(async () => {
    setState({ kind: 'checking' });
    setMessage('');
    const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setState({ kind: 'error', message: sessionError.message });
      return;
    }
    const user = sessionResult.session?.user;
    lastInspectedUserId.current = user?.id ?? null;
    if (!user || user.app_metadata?.role !== 'system_admin') {
      setState({ kind: 'ready' });
      return;
    }

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
      setState({ kind: 'ready' });
      return;
    }

    const verified = factors.totp.find((factor) => factor.status === 'verified');
    if (verified) {
      setState({ kind: 'challenge', factorId: verified.id });
      return;
    }

    // Remove only unverified enrollments left over from interrupted setup.
    for (const factor of factors.totp.filter((item) => item.status !== 'verified')) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        setState({ kind: 'error', message: error.message });
        return;
      }
    }
    const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Web2Table System Admin ${new Date().toISOString().replace(/[:.]/g, '-')}`,
    });
    if (enrollmentError) {
      setState({ kind: 'error', message: enrollmentError.message });
      return;
    }
    setState({ kind: 'enroll', factorId: enrollment.id, qrCode: enrollment.totp.qr_code, uri: enrollment.totp.uri, secret: enrollment.totp.secret });
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
      if (event !== 'SIGNED_IN' || !session?.user) return;
      if (lastInspectedUserId.current === session.user.id || inspectionInFlight.current) return;
      setState({ kind: 'checking' });
      window.setTimeout(() => {
        if (active) runInspection();
      }, 0);
    });

    runInspection();

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [inspect]);

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
      setCode('');
      setState({ kind: 'ready' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to verify the authenticator code.');
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'ready') return <>{children}</>;
  if (state.kind === 'checking') {
    return <main className="auth-shell"><section className="auth-card"><h1>Checking account security</h1><p>Verifying your System Admin MFA status…</p></section></main>;
  }
  if (state.kind === 'error') {
    return <main className="auth-shell"><section className="auth-card"><h1>MFA setup unavailable</h1><p>{state.message}</p><button type="button" onClick={() => void inspect()}>Try again</button></section></main>;
  }

  const enrolling = state.kind === 'enroll';
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="mfa-title">
        <p className="eyebrow">Web2Table Security</p>
        <h1 id="mfa-title">{enrolling ? 'Secure your System Admin account' : 'Verify your identity'}</h1>
        <p>{enrolling
          ? 'Scan this QR code with an authenticator app, then enter the six-digit code to finish setup.'
          : 'Enter the current six-digit code from your authenticator app to access the System Admin dashboard.'}</p>
        {enrolling && (
          <div className="mfa-enrollment">
            <img src={state.qrCode} alt="Authenticator enrollment QR code" style={{ display: 'block', width: 'min(100%, 320px)', height: 'auto', aspectRatio: '1 / 1', objectFit: 'contain', background: '#fff', padding: '12px', boxSizing: 'border-box', imageRendering: 'pixelated', margin: '16px auto' }} />
            <details>
              <summary>Can't scan the QR code? Set up manually</summary>
              <p>In your authenticator app, choose the option to enter a setup key manually. Enter this secret key:</p>
              <code style={{ display: 'block', overflowWrap: 'anywhere', userSelect: 'all', padding: '10px' }}>{state.secret}</code>
              <button type="button" className="secondary-button" onClick={() => void navigator.clipboard.writeText(state.secret).then(() => setMessage('Setup key copied.')).catch(() => setMessage('Select and copy the setup key above.'))}>Copy setup key</button>
              <p>Account: your System Admin email. Type: time-based (TOTP).</p>
            </details>
          </div>
        )}
        <form onSubmit={verify}>
          <label htmlFor="system-admin-mfa-code">Authenticator code</label>
          <input id="system-admin-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\\D/g, '').slice(0, 6))} required />
          {message && <p role="alert" className="error-banner">{message}</p>}
          <button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : enrolling ? 'Verify and enable MFA' : 'Verify and continue'}</button>
        </form>
        <div className="mfa-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '12px', width: '100%' }}>
          <button type="button" className="secondary-button" style={{ position: 'static', float: 'none', margin: 0, flex: '0 0 auto' }} onClick={() => void supabase.auth.signOut()}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
