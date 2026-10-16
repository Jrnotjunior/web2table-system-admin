export type TotpResetAccount = { userId: string; restaurantId: string; restaurantName: string; displayName: string; email: string; role: 'restaurant_owner' | 'staff' | 'system_admin'; staffRole?: string; accessLevel?: string };
export type PendingTotpReset = { userId: string; displayName: string; role: 'restaurant_owner' | 'staff' | 'system_admin'; restaurantId: string; accessLevel?: string };
type Props = {
  canReset: boolean;
 accounts: TotpResetAccount[]; loading: boolean; search: string; onSearchChange: (value: string) => void;
 error: string; staffActionId: string | null; onRequestReset: (account: TotpResetAccount) => void;
 pendingReset: PendingTotpReset | null; success: string; actionError: string;
 onCloseConfirmation: () => void; onConfirmReset: () => void; onDone: () => void;
};
export default function TotpResetPage(props: Props) {
 const { canReset, accounts, loading, search, onSearchChange, error, staffActionId, onRequestReset, pendingReset, success, actionError, onCloseConfirmation, onConfirmReset, onDone } = props;
 const filtered = accounts.filter((a) => [a.displayName,a.email,a.restaurantName,a.role === 'restaurant_owner' ? 'restaurant owner owner' : a.role === 'system_admin' ? 'system administrator co-admin' : 'staff',a.staffRole || '',a.userId].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
 return <>
  <section className="page-content totp-reset-page">
   {error && <div className="form-error" role="alert">{error}</div>}
   <div className="totp-reset-searchbar"><label htmlFor="totp-reset-search">Search accounts</label><input id="totp-reset-search" className="uniform-search-input" type="search" value={search} onChange={e=>onSearchChange(e.target.value)} placeholder="Search by name, email, restaurant, or role…" autoComplete="off"/><span className="totp-reset-result-count">{filtered.length} accounts</span></div>
   {loading ? <p>Loading System Administrators, restaurant owners, and staff…</p> : <div className="table-wrap"><table><thead><tr><th>Account</th><th>Role / Access</th><th>Restaurant</th>{canReset && <th>Action</th>}</tr></thead><tbody>
    {filtered.map(a=><tr key={a.role+':'+a.userId+':'+a.restaurantId}><td>{a.displayName}{a.email ? <div className="muted-text">{a.email}</div> : null}</td><td>{a.role==='restaurant_owner'?'Restaurant owner':a.role==='system_admin'?'System Administrator':(a.staffRole||'Staff')}{a.role==='system_admin' && a.accessLevel ? <div className="muted-text">{a.accessLevel === 'view_only' ? 'View Only' : 'Administrator'}</div> : null}</td><td>{a.role==='system_admin' ? '—' : a.restaurantName}</td>{canReset && <td><button className="secondary-button" type="button" disabled={staffActionId!==null} onClick={()=>onRequestReset(a)}>{staffActionId===a.userId?'Resetting…':'Reset TOTP'}</button></td>}</tr>)}
    {accounts.length===0 && <tr><td colSpan={4}>No eligible System Administrator, restaurant owner, or staff accounts were found.</td></tr>}
    {accounts.length>0 && filtered.length===0 && <tr><td colSpan={4}>No accounts match your search.</td></tr>}
   </tbody></table></div>}
  </section>
  {canReset && pendingReset && <div className="modal-backdrop totp-reset-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&staffActionId===null)onCloseConfirmation();}}>
   <section className="modal-card totp-reset-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="totp-reset-confirm-title">
    <div className="modal-heading"><div><div className="eyebrow">ACCOUNT SECURITY</div><h2 id="totp-reset-confirm-title">Reset authenticator?</h2></div><button className="icon-button" type="button" onClick={onCloseConfirmation} disabled={staffActionId!==null} aria-label="Close">×</button></div>
    <div className="totp-reset-confirm-content">{success ? <div className="totp-reset-success" role="status"><strong>Reset successful</strong><p>{success}</p></div> : <><p>You're about to reset the authenticator for <strong>{pendingReset.displayName}</strong>.</p><p>They'll need to sign in and set up a new authenticator before accessing Web2Table.</p><p className="totp-reset-confirm-note">Their password and account role will remain unchanged. Only their authenticator factors will be removed.</p>{actionError&&<div className="error-banner" role="alert">{actionError}</div>}</>}</div>
    <div className="modal-actions">{success?<button type="button" className="danger-button" onClick={onDone}>Done</button>:<><button type="button" className="secondary-button" onClick={onCloseConfirmation} disabled={staffActionId!==null}>Cancel</button><button type="button" className="danger-button" onClick={onConfirmReset} disabled={staffActionId!==null}>{staffActionId===pendingReset.userId?'Resetting…':'Reset authenticator'}</button></>}</div>
   </section>
  </div>}
 </>;
}