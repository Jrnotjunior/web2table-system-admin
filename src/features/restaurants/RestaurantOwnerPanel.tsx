type Props = {
 loading: boolean;
 ownerUserId: string;
 ownerName: string;
 ownerEmail: string;
 canManage: boolean;
 ownerSaving: boolean;
 error: string;
 onEmailChange: (value: string) => void;
 onRequestAssign: () => void;
 onRequestRemove: () => void;
};
export default function RestaurantOwnerPanel(p: Props) {
 return <div className="manage-overview"><div className="overview-section">
  <div className="eyebrow">Restaurant Owner</div><h3>Owner account</h3>
  <p>Assign an existing Supabase account as the owner of this restaurant. A new account is not created here.</p>
  {p.loading ? <div className="empty-state owner-loading">Loading owner...</div> : p.ownerUserId ? <div className="owner-current">
   <div className="owner-avatar">{(p.ownerName || p.ownerEmail).charAt(0).toUpperCase()}</div>
   <div className="owner-current-details"><strong>{p.ownerName || 'Restaurant Owner'}</strong><span>{p.ownerEmail}</span><small>User ID: {p.ownerUserId}</small></div>
   {p.canManage && <button className="danger-button" onClick={p.onRequestRemove} disabled={p.ownerSaving}>Remove owner</button>}
  </div> : p.canManage ? <div className="owner-form">
   <label>Owner account email<input type="email" value={p.ownerEmail} onChange={e=>p.onEmailChange(e.target.value)} placeholder="owner@example.com"/></label>
   <button onClick={p.onRequestAssign} disabled={p.ownerSaving || !p.ownerEmail.trim()}>Assign owner</button>
  </div> : <div className="empty-state">No restaurant owner is assigned. View Only access cannot change ownership.</div>}
  {p.error && <div className="error-banner">{p.error}</div>}
 </div></div>;
}
