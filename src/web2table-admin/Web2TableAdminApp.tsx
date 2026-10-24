import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './web2table-admin.css';

type Gate =
  | { kind:'checking' }
  | { kind:'signed-out' }
  | { kind:'denied' }
  | { kind:'enroll'; factorId:string; qr:string; secret:string }
  | { kind:'incomplete' }
  | { kind:'challenge'; factorId:string }
  | { kind:'ready' }
  | { kind:'error'; message:string };

type Tenant = { id:string; slug:string; name:string; status:string; created_at:string };
const STORE_URL = 'https://jrnotjunior.github.io/Multi-Tenant-Restaurant-Ordering-Platform-SaaS/';
const tenantSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function Web2TableAdminApp() {
  const [session,setSession] = useState<Session|null>(null);
  const [gate,setGate] = useState<Gate>({kind:'checking'});
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [newPassword,setNewPassword] = useState('');
  const [totp,setTotp] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [tenants,setTenants] = useState<Tenant[]>([]);
  const [newName,setNewName] = useState('');
  const [newSlug,setNewSlug] = useState('');
  const [branchName,setBranchName] = useState('Main Branch');
  const [branchSlug,setBranchSlug] = useState('main');
  const [inviteTenant,setInviteTenant] = useState('');
  const [inviteEmail,setInviteEmail] = useState('');

  const inspect = useCallback(async (current:Session|null) => {
    if (!current) {setGate({kind:'signed-out'});return;}
    setGate({kind:'checking'});
    // This identity check happens on Web2Table's Supabase Auth instance.
    // The database, not the browser, is the authority for admin eligibility.
    const {data:eligible,error:eligibilityError} =
      await supabase.rpc('privileged_route_eligible',{p_workspace:'admin'});
    if (eligibilityError) throw eligibilityError;
    // A one-time first-admin invitation authorizes MFA enrollment, NOT
    // administration. Matching a verified email requires its own trusted RPC.
    let bootstrapCandidate=false;
    if(eligible!==true){
      const {data:candidate,error:candidateError} =
        await supabase.rpc('is_initial_admin_bootstrap_candidate');
      if(candidateError)throw candidateError;
      bootstrapCandidate=candidate===true;
      if(!bootstrapCandidate){setGate({kind:'denied'});return;}
    }
    const {data:aal,error:aalError} = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw aalError;
    if (aal.currentLevel==='aal2') {
      if(bootstrapCandidate){
        const {data:claimed,error:claimError} =
          await supabase.rpc('claim_initial_admin_bootstrap');
        if(claimError)throw claimError;
        if(claimed!==true)throw Error('Administrator invitation could not be claimed.');
      }
      const {data:active,error:activeError} =
        await supabase.rpc('privileged_route_eligible',{p_workspace:'admin'});
      if(activeError)throw activeError;
      if(active!==true){setGate({kind:'denied'});return;}
      setGate({kind:'ready'});return;
    }
    const {data:factors,error:factorsError} = await supabase.auth.mfa.listFactors();
    if(factorsError) throw factorsError;
    const verified=factors.totp.find(x=>x.status==='verified');
    if(verified){setGate({kind:'challenge',factorId:verified.id});return;}
    // Never discard a factor automatically; recovery is explicit and never
    // removes any verified factor.
    if(factors.totp.length){setGate({kind:'incomplete'});return;}
    const {data:enrollment,error:enrollError} = await supabase.auth.mfa.enroll({
      factorType:'totp',friendlyName:'Web2Table System Admin',
    });
    if(enrollError) throw enrollError;
    setGate({kind:'enroll',factorId:enrollment.id,qr:enrollment.totp.qr_code,secret:enrollment.totp.secret});
  },[]);

  useEffect(()=>{
    let live=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
      if(!live)return;
      setSession(next);
      if(event==='SIGNED_OUT'){
        setGate({kind:'signed-out'});
        setTenants([]);
        setError('');
      }
    });
    void supabase.auth.getSession().then(({data,error})=>{
      if(!live)return;
      if(error)throw error;
      setSession(data.session);
      return inspect(data.session);
    }).catch(e=>{
      if(live)setGate({kind:'error',message:e instanceof Error?e.message:'Unable to check account'});
    });
    return()=>{live=false;subscription.unsubscribe();};
  },[inspect]);

  async function refreshTenants(){
    const {data,error:dbError}=await supabase.from('tenants')
      .select('id,slug,name,status,created_at')
      .order('created_at',{ascending:false}).limit(100);
    if(dbError)throw dbError;
    const list=(data??[]) as Tenant[];
    setTenants(list);
    setInviteTenant(previous=>list.some(t=>t.id===previous)?previous:(list[0]?.id??''));
  }
  useEffect(()=>{
    if(gate.kind!=='ready')return;
    let live=true;
    void refreshTenants().catch(e=>{
      if(live)setError(e instanceof Error?e.message:'Unable to load restaurants');
    });
    return()=>{live=false;};
  },[gate.kind]);

  async function run(action:()=>Promise<void>){
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{await action();}catch(e){setError(e instanceof Error?e.message:'Action failed');}
    finally{setBusy(false);}
  }
  function signIn(event:FormEvent){
    event.preventDefault();
    void run(async()=>{
      const {data,error:authError}=await supabase.auth.signInWithPassword({
        email:email.trim(),password,
      });
      if(authError)throw authError;
      setPassword('');
      setSession(data.session);
      await inspect(data.session);
    });
  }
  function verify(event:FormEvent){
    event.preventDefault();
    if(gate.kind!=='challenge'&&gate.kind!=='enroll')return;
    const factorId=gate.factorId;
    void run(async()=>{
      const {error:verifyError}=await supabase.auth.mfa.challengeAndVerify({
        factorId,code:totp.trim(),
      });
      if(verifyError)throw verifyError;
      setTotp('');
      const {data,error:sessionError}=await supabase.auth.getSession();
      if(sessionError)throw sessionError;
      setSession(data.session);
      await inspect(data.session);
    });
  }
  function restartEnrollment(){
    void run(async()=>{
      const {data,error:factorError}=await supabase.auth.mfa.listFactors();
      if(factorError)throw factorError;
      if(data.totp.some(f=>f.status==='verified'))
        throw Error('Verified authenticator exists. Sign in with it or request manual account recovery.');
      for(const factor of data.totp){
        const {error:removeError}=await supabase.auth.mfa.unenroll({factorId:factor.id});
        if(removeError)throw removeError;
      }
      await inspect(session);
    });
  }
  function createRestaurant(event:FormEvent){
    event.preventDefault();
    if(!tenantSlug.test(newSlug)||!tenantSlug.test(branchSlug)){
      setError('Restaurant and branch URLs may contain lowercase letters, numbers and hyphens.');return;
    }
    void run(async()=>{
      const {data,error:rpcError}=await supabase.rpc('admin_create_restaurant',{
        p_slug:newSlug,p_name:newName.trim(),p_branch_slug:branchSlug,p_branch_name:branchName.trim(),
      });
      if(rpcError)throw rpcError;
      if(typeof data!=='string')throw Error('No tenant ID returned');
      await refreshTenants();
      setNewName('');setNewSlug('');setBranchName('Main Branch');setBranchSlug('main');
      setNotice('Restaurant draft and initial branch created. No owner was invited.');
    });
  }
  function queueInvitation(event:FormEvent){
    event.preventDefault();
    if(!tenants.some(t=>t.id===inviteTenant)){setError('Select a valid restaurant.');return;}
    void run(async()=>{
      const {data,error:rpcError}=await supabase.rpc('request_privileged_invitation',{
        p_tenant_id:inviteTenant,p_email:inviteEmail.trim().toLowerCase(),
        p_role:'restaurant_owner',p_branch_id:null,
      });
      if(rpcError)throw rpcError;
      if(typeof data!=='string')throw Error('Invitation queue did not return a record ID');
      setInviteEmail('');
      setNotice('Owner invitation recorded only. Email delivery has NOT been activated.');
    });
  }
  function signOut(){void run(async()=>{
    const {error:authError}=await supabase.auth.signOut();
    if(authError)throw authError;
    setGate({kind:'signed-out'});setSession(null);setTenants([]);
  });}

  return <div className="web2table-admin">
    <header className="w2t-top">
      <a className="w2t-logo" href={import.meta.env.BASE_URL}><span>W2T</span> Web2Table
        <small>System Administration</small></a>
      <div className="w2t-top-actions">
        <span className="w2t-environment">WEB2TABLE PLATFORM CONNECTION</span>
        {session&&<button className="w2t-ghost" type="button" disabled={busy} onClick={signOut}>Sign out</button>}
      </div>
    </header>
    <main className="w2t-container">
      <p className="w2t-eyebrow">SYSTEM ADMIN · WEB2TABLE</p>
      <h1>Restaurant platform administration</h1>
      <p className="w2t-intro">A separate administration application, connected to the new restaurant ordering platform through verified Supabase authorization.</p>
      <div className="w2t-notice">This Web2Table connection uses the new Web2Table database, not the older restaurant records. Existing accounts in another Auth project do not gain access automatically. Public storefronts and checkout remain separate.</div>
      {error&&<p className="w2t-error" role="alert">{error}</p>}
      {notice&&<p className="w2t-success" role="status">{notice}</p>}

      {gate.kind==='checking'&&<section className="w2t-card" role="status"><h2>Verifying access…</h2><p>Checking platform-administrator membership and MFA.</p></section>}
      {gate.kind==='signed-out'&&<section className="w2t-card w2t-auth">
        <h2>Sign in to Web2Table</h2>
        <p>Sign in with an account invited and verified in the new Web2Table Supabase Auth project. Existing accounts from the older project are not imported. First administrators activate their one-time invitation after setting up MFA.</p>
        <form onSubmit={signIn} className="w2t-form">
          <label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
          <button disabled={busy} type="submit">Sign in</button>
        </form>
      </section>}
      {gate.kind==='denied'&&<section className="w2t-card w2t-auth">
        <h2>Administrator access not enabled</h2>
        <p>This identity is neither an active administrator nor the verified recipient of an unexpired first-administrator invitation in the new Web2Table project.</p>
        <p>Access must be approved and provisioned through a trusted administrator-bootstrap procedure. No security checks will be bypassed.</p>
        <button disabled={busy} type="button" onClick={signOut}>Sign out</button>
      </section>}
      {(gate.kind==='challenge'||gate.kind==='enroll')&&<section className="w2t-card w2t-auth">
        <h2>{gate.kind==='enroll'?'Set up authenticator MFA':'Verify authenticator code'}</h2>
        {gate.kind==='enroll'&&<div className="w2t-qr">
          <p>Scan this QR code in your authenticator app, then enter its six-digit code.</p>
          <img src={gate.qr} alt="Authenticator setup QR code"/>
          <p className="w2t-secret">Manual setup key: <code>{gate.secret}</code></p>
        </div>}
        <form className="w2t-form" onSubmit={verify}>
          <label>One-time code<input value={totp} onChange={e=>setTotp(e.target.value)}
            type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code"/></label>
          <button disabled={busy} type="submit">Verify MFA</button>
        </form>
      </section>}
      {gate.kind==='incomplete'&&<section className="w2t-card w2t-auth">
        <h2>Incomplete authenticator setup</h2>
        <p>An unfinished enrollment exists. You can restart it; only unverified enrollment records will be cleared.</p>
        <button type="button" disabled={busy} onClick={restartEnrollment}>Restart incomplete setup</button>
      </section>}
      {gate.kind==='error'&&<section className="w2t-card w2t-auth">
        <h2>Access check failed</h2><p role="alert">{gate.message}</p>
        <button type="button" disabled={busy} onClick={()=>void run(()=>inspect(session))}>Retry secure access check</button>
      </section>}
      {gate.kind==='ready'&&<>
        <section className="w2t-card w2t-auth">
          <h2>Secure your administrator sign-in</h2>
          <p>After accepting a new-project email invitation, set a strong password for future sign-ins. Your email verification and MFA enrollment must be completed first. You can skip this if you already have a password.</p>
          <form className="w2t-form" onSubmit={event=>{
            event.preventDefault();
            void run(async()=>{
              if(newPassword.length<12)throw Error('Use at least 12 characters for your password.');
              const {error:updateError}=await supabase.auth.updateUser({password:newPassword});
              if(updateError)throw updateError;
              setNewPassword('');
              setNotice('Sign-in password saved.');
            });
          }}>
            <label>New password (12+ characters)
              <input type="password" autoComplete="new-password" minLength={12}
                value={newPassword} onChange={event=>setNewPassword(event.target.value)}
                placeholder="Set a password for future logins" required/>
            </label>
            <button type="submit" disabled={busy}>Save password</button>
          </form>
        </section>
        <section className="w2t-summary" aria-label="Platform status">
          <div className="w2t-card"><span>Authorized access</span><strong>MFA verified</strong></div>
          <div className="w2t-card"><span>Restaurants</span><strong>{tenants.length}</strong></div>
          <div className="w2t-card"><span>Customer storefront</span>
            <a href={STORE_URL} target="_blank" rel="noreferrer">Open site ↗</a></div>
        </section>
        <div className="w2t-columns">
          <section className="w2t-card">
            <h2>Register a restaurant</h2>
            <p>Create a new restaurant and its first branch as an unpublished storefront draft. This action requires MFA on the server.</p>
            <form className="w2t-form" onSubmit={createRestaurant}>
              <label>Restaurant name<input required minLength={2} maxLength={160} value={newName} onChange={e=>setNewName(e.target.value)}/></label>
              <label>Restaurant URL slug<input required minLength={3} maxLength={64} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={newSlug} onChange={e=>setNewSlug(e.target.value.toLowerCase())} placeholder="my-restaurant"/></label>
              <label>Initial branch name<input required minLength={2} maxLength={160} value={branchName} onChange={e=>setBranchName(e.target.value)}/></label>
              <label>Branch slug<input required minLength={2} maxLength={64} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={branchSlug} onChange={e=>setBranchSlug(e.target.value.toLowerCase())}/></label>
              <button disabled={busy} type="submit">Create restaurant draft</button>
            </form>
          </section>
          <section className="w2t-card">
            <h2>Restaurant Owner invitation</h2>
            <p>Queue an owner invitation for a selected restaurant. The email sender remains off until configured and reviewed.</p>
            <form className="w2t-form" onSubmit={queueInvitation}>
              <label>Restaurant<select required value={inviteTenant} onChange={e=>setInviteTenant(e.target.value)}>
                <option value="">Select a restaurant</option>
                {tenants.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}
              </select></label>
              <label>Owner email<input type="email" required maxLength={254} value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label>
              <button type="submit" disabled={busy||!inviteTenant}>Queue invitation — do not send email</button>
            </form>
            <p className="w2t-fineprint">No real owner will receive an email from this action. Owners must accept a verified invitation and satisfy MFA before managing restaurant menus.</p>
          </section>
        </div>
        <section className="w2t-card">
          <div className="w2t-section-heading"><h2>Web2Table restaurants</h2><button className="w2t-ghost" onClick={()=>void run(refreshTenants)} disabled={busy} type="button">Refresh</button></div>
          {tenants.length===0?<p>No restaurants have been provisioned in the new platform.</p>:
            <div className="w2t-table-scroll"><table>
              <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Storefront</th></tr></thead>
              <tbody>{tenants.map(t=><tr key={t.id}>
                <td>{t.name}</td><td>{t.slug}</td><td>{t.status}</td>
                <td><a href={STORE_URL+'order/'+encodeURIComponent(t.slug)} target="_blank" rel="noreferrer">Open menu ↗</a></td>
              </tr>)}</tbody>
            </table></div>}
        </section>
      </>}
    </main>
    <footer className="w2t-footer">Web2Table · Separate System Admin application · Server-enforced access · Inter + Manrope</footer>
  </div>;
}
