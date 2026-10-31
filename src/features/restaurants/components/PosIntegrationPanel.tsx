import { useState } from 'react';
import type { Restaurant } from '../types';
import type { PosIntegrationAction, PosIntegrationStatus } from '../services/posIntegrationService';

type Props = {
  restaurant: Restaurant;
  status: PosIntegrationStatus;
  loading: boolean;
  saving: boolean;
  error: string;
  message: string;
  canManage: boolean;
  onAction: (action: PosIntegrationAction, reason: string) => void;
};

const copy: Record<PosIntegrationStatus, string> = {
  not_enabled: 'POS has not been enabled for this tenant.',
  pending: 'The tenant has requested POS integration. Awaiting System Administrator approval.',
  active: 'POS integration is active. This does not change the normal Web2table ordering workflow.',
  suspended: 'POS access is suspended. The normal Web2table cashier remains available.',
  revoked: 'POS integration has been revoked. The normal Web2table cashier remains available.',
};

export default function PosIntegrationPanel({ restaurant, status, loading, saving, error, message, canManage, onAction }: Props) {
  const [reason, setReason] = useState('');
  return <section aria-labelledby="pos-integration-title">
    <div className="eyebrow">OPTIONAL TENANT INTEGRATION</div>
    <h3 id="pos-integration-title">POS integration</h3>
    <p>POS is a separate optional application. Every tenant continues to use the standard Web2table cashier unless an authorized System Administrator enables POS.</p>
    <div className="detail-grid">
      <div className="detail-item"><span>Restaurant</span><strong>{restaurant.name}</strong></div>
      <div className="detail-item"><span>Integration status</span><strong>{loading ? 'Loading…' : status.replaceAll('_', ' ')}</strong></div>
    </div>
    <p className="muted">{copy[status]}</p>
    <label className="detail-item" style={{display:'grid',gap:6,marginTop:16}}>
      <span>Administrative reason (optional)</span>
      <input value={reason} maxLength={500} onChange={event=>setReason(event.target.value)} disabled={!canManage||saving} placeholder="Record the reason for this change" />
    </label>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {message && <div className="status-panel" role="status"><strong>{message}</strong></div>}
    {canManage && <div className="status-panel" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {status!=='active' && <button type="button" disabled={loading||saving} onClick={()=>onAction('enable',reason)}>{saving?'Saving…':'Enable POS'}</button>}
      {status==='active' && <button type="button" disabled={loading||saving} onClick={()=>onAction('suspend',reason)}>Suspend POS</button>}
      {status!=='revoked' && <button type="button" className="danger-button" disabled={loading||saving} onClick={()=>onAction('revoke',reason)}>Revoke POS</button>}
    </div>}
    {!canManage && <p className="muted">Your System Administrator access level is read-only. You cannot change POS integration.</p>}
  </section>;
}
