import { useEffect, useState, type FormEvent } from 'react';
import { createAdminBranch, fetchAdminBranches, updateAdminBranch, type AdminBranch } from '../services/branchService';

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

export default function BranchManagementPanel({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true); setError('');
    const result = await fetchAdminBranches(tenantId);
    if (result.error) setError(result.error.message || 'Unable to load restaurant branches.');
    else setBranches(result.data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [tenantId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving) return;
    const cleanName = name.trim(); const cleanSlug = slug.trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug) || cleanSlug.length < 2) {
      setError('Enter a branch name and a URL slug using lowercase letters, numbers, and hyphens.'); return;
    }
    setSaving(true); setError(''); setMessage('');
    const result = await createAdminBranch(tenantId, cleanSlug, cleanName);
    if (result.error) { setError(result.error.message || 'Unable to create this branch.'); setSaving(false); return; }
    setName(''); setSlug(''); setSlugTouched(false);
    setMessage('Branch created as inactive. The owner must enter its exact pickup address and configure the delivery map pin and pricing before you activate it.');
    await load(); setSaving(false);
  }

  async function toggle(branch: AdminBranch) {
    if (!canManage || branch.isDefault || workingId) return;
    if (!branch.isActive && (!branch.hasDeliveryLocation || !branch.hasPickupAddress)) {
      setError('The owner must enter this branch’s exact pickup address and configure its delivery map pin and pricing before it can be activated.'); return;
    }
    setWorkingId(branch.id); setError(''); setMessage('');
    const result = await updateAdminBranch(tenantId, branch.id, branch.name, !branch.isActive);
    if (result.error) setError(result.error.message || 'Unable to update branch status.');
    else { setMessage(branch.isActive ? 'Branch deactivated.' : 'Branch activated and available to customers.'); await load(); }
    setWorkingId('');
  }

  return <div className="manage-overview">
    <div className="overview-section">
      <div className="eyebrow">Restaurant locations</div>
      <h3>Branches</h3>
      <p className="intro">The System Administrator is the only role that can add a branch. Owners manually enter its exact pickup address and configure the separate delivery map pin and pricing after it is created.</p>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {message && <div className="success-banner" role="status">{message}</div>}
      {loading ? <p>Loading branches…</p> : <div className="restaurant-branch-list">
        {branches.map(branch => <article className="restaurant-branch-row" key={branch.id}>
          <div><strong>{branch.name}{branch.isDefault?' · Main branch':''}</strong><small>/{branch.slug} · {branch.hasPickupAddress?'Pickup address set':'Pickup address needed'} · {branch.hasDeliveryLocation?'Delivery map configured':'Delivery map needed'}</small></div>
          <div><span className={`status-badge ${branch.isActive?'active':'inactive'}`}>{branch.isActive?'Active':'Inactive'}</span>
            {!branch.isDefault&&canManage&&<button type="button" className={branch.isActive?'secondary-button':'primary-button'} disabled={workingId!==''||(!branch.isActive&&(!branch.hasDeliveryLocation||!branch.hasPickupAddress))} onClick={()=>void toggle(branch)}>{workingId===branch.id?'Saving…':branch.isActive?'Deactivate':'Activate'}</button>}
          </div>
        </article>)}
        {branches.length===0&&<p>No branches have been created for this restaurant.</p>}
      </div>}
    </div>
    {canManage&&<form className="overview-section restaurant-branch-form" onSubmit={event=>void submit(event)}>
      <div className="eyebrow">System Administrator action</div><h3>Add a branch</h3>
      <p>New branches start inactive. The owner sets the branch’s delivery origin and fee rules in Store Settings. Activate it here after configuration.</p>
      <div className="restaurant-form-grid">
        <label>Branch name<input required minLength={2} maxLength={160} value={name} onChange={event=>{const value=event.target.value;setName(value);if(!slugTouched)setSlug(slugify(value));}} placeholder="e.g. Makati" /></label>
        <label>Branch URL slug<input required minLength={2} maxLength={64} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={event=>{setSlugTouched(true);setSlug(event.target.value.toLowerCase());}} placeholder="e.g. makati" /><small>Lowercase letters, numbers, and hyphens.</small></label>
      </div>
      <button type="submit" className="primary-button" disabled={saving}>{saving?'Creating…':'Create branch'}</button>
    </form>}
  </div>;
}
