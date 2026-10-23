import type { TaxpayerProfileReview } from '../services/restaurantSettingsService';

type RestaurantSettingsPanelProps = {
  canManage: boolean;
  settingsLoading: boolean;
  vatRegistered: boolean;
  onVatRegisteredChange: (value: boolean) => void;
  vatRate: string;
  onVatRateChange: (value: string) => void;
  pricesVatInclusive: boolean;
  onPricesVatInclusiveChange: (value: boolean) => void;
  cashOnDeliveryEnabled: boolean;
  cashOnPickupEnabled: boolean;
  cashOnTakeOutEnabled: boolean;
  onCashOnDeliveryChange: (value: boolean) => void;
  onCashOnPickupChange: (value: boolean) => void;
  onCashOnTakeOutChange: (value: boolean) => void;
  automaticRiderAssignmentEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  onOnlinePaymentsEnabledChange: (value: boolean) => void;
  onAutomaticRiderAssignmentChange: (value: boolean) => void;
  settingsError: string;
  settingsSaving: boolean;
  onRequestSave: () => void;
  taxpayerProfileLoading: boolean;
  taxpayerProfile: TaxpayerProfileReview | null;
  onTaxpayerProfileChange: (profile: TaxpayerProfileReview) => void;
  taxpayerProfileError: string;
  taxpayerProfileMessage: string;
  taxpayerProfileSaving: boolean;
  onRequestReviewSave: () => void;
};

export default function RestaurantSettingsPanel({
  canManage,
  settingsLoading,
  vatRegistered,
  onVatRegisteredChange,
  vatRate,
  onVatRateChange,
  pricesVatInclusive,
  onPricesVatInclusiveChange,
  cashOnDeliveryEnabled,
  onCashOnDeliveryChange,
  cashOnPickupEnabled,
  onCashOnPickupChange,
  cashOnTakeOutEnabled,
  onCashOnTakeOutChange,
  automaticRiderAssignmentEnabled,
  onAutomaticRiderAssignmentChange,
  onlinePaymentsEnabled,
  onOnlinePaymentsEnabledChange,
  settingsError,
  settingsSaving,
  onRequestSave,
  taxpayerProfileLoading,
  taxpayerProfile,
  onTaxpayerProfileChange,
  taxpayerProfileError,
  taxpayerProfileMessage,
  taxpayerProfileSaving,
  onRequestReviewSave,
}: RestaurantSettingsPanelProps) {
  return (
    <div className="manage-overview">
      <div className="overview-section">
        <div className="eyebrow">Restaurant Settings</div>
        <h3>Operational controls</h3>
        <p>These are platform-controlled financial and workflow settings. Restaurant owners can view their status, but only the System Administrator can change them.</p>

        {settingsLoading ? (
          <div className="empty-state">Loading settings...</div>
        ) : (
          <>
            <div className="detail-grid">
              <div className="detail-item">
                <span>VAT registered</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={vatRegistered} onChange={(event) => onVatRegisteredChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{vatRegistered ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="detail-item">
                <span>VAT rate</span>
                <label>
                  <input type="number" min="0" max="100" step="0.01" value={vatRate} onChange={(event) => onVatRateChange(event.target.value)} disabled={!canManage} />
                </label>
              </div>
              <div className="detail-item">
                <span>Prices are VAT-inclusive</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={pricesVatInclusive} onChange={(event) => onPricesVatInclusiveChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{pricesVatInclusive ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="detail-item">
                <span>Cash on Delivery</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={cashOnDeliveryEnabled} onChange={(event) => onCashOnDeliveryChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{cashOnDeliveryEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="detail-item">
                <span>Cash for Pickup</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={cashOnPickupEnabled} onChange={(event) => onCashOnPickupChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{cashOnPickupEnabled ? "Enabled" : "Disabled"}</span>
                </label>
              </div>
              <div className="detail-item">
                <span>Cash for Take-out</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={cashOnTakeOutEnabled} onChange={(event) => onCashOnTakeOutChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{cashOnTakeOutEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="detail-item">
                <span>Online Payments</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={onlinePaymentsEnabled} onChange={(event) => onOnlinePaymentsEnabledChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{onlinePaymentsEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="detail-item">
                <span>Automatic rider assignment</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={automaticRiderAssignmentEnabled} onChange={(event) => onAutomaticRiderAssignmentChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{automaticRiderAssignmentEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
            </div>

            {settingsError && <div className="error-banner">{settingsError}</div>}

            <div className="status-panel">
              <div>
                <strong>Platform-level restaurant controls</strong>
                <span>{canManage ? 'System Administrator changes are saved through protected database functions.' : 'View Only access can review these settings but cannot change them.'}</span>
              </div>
              {canManage && <button onClick={onRequestSave} disabled={settingsSaving}>
                {settingsSaving ? 'Saving...' : 'Save settings'}
              </button>}
            </div>
          </>
        )}

        <div className="overview-section" style={{ marginTop: 24 }}>
          <div className="eyebrow">BIR readiness</div>
          <h3>Taxpayer registration review</h3>
          <p>Review the tenant's submitted registration details and record only route/permit references verified from official documents. This platform review is not BIR accreditation or permission to issue official invoices.</p>
          {taxpayerProfileLoading ? <div className="empty-state">Loading taxpayer profile…</div> : !taxpayerProfile ? (
            <div className="empty-state">No taxpayer profile is available. Ask the restaurant owner to save and submit it under Store Settings → Tax &amp; receipts.</div>
          ) : (
            <>
              <div className="detail-grid">
                <div className="detail-item"><span>Registered legal name</span><strong>{taxpayerProfile.registered_legal_name || 'Not provided'}</strong></div>
                <div className="detail-item"><span>Trade name</span><strong>{taxpayerProfile.trade_name || '—'}</strong></div>
                <div className="detail-item"><span>TIN</span><strong>{taxpayerProfile.tin || 'Not provided'}</strong></div>
                <div className="detail-item"><span>Registered address</span><strong>{taxpayerProfile.registered_address || 'Not provided'}</strong></div>
                <div className="detail-item"><span>Branch code</span><strong>{taxpayerProfile.branch_code || 'Not provided'}</strong></div>
                <div className="detail-item"><span>Taxpayer category</span><strong>{taxpayerProfile.taxpayer_category.replace('_', ' ')}</strong></div>
                <div className="detail-item"><span>Owner profile status</span><strong>{taxpayerProfile.profile_status.replaceAll('_', ' ')}</strong></div>
              </div>
              <div className="detail-grid" style={{ marginTop: 18 }}>
                <div className="detail-item">
                  <span>Platform review status</span>
                  <select value={taxpayerProfile.profile_status} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, profile_status: event.target.value as TaxpayerProfileReview['profile_status'] })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading}>
                    <option value="submitted_for_review">Submitted for review</option>
                    <option value="needs_correction">Needs correction</option>
                    <option value="reviewed">Reviewed (platform review only)</option>
                  </select>
                </div>
                <div className="detail-item">
                  <span>Regulatory route</span>
                  <select value={taxpayerProfile.bir_route_status} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, bir_route_status: event.target.value as TaxpayerProfileReview['bir_route_status'] })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading}>
                    <option value="unconfirmed">Unconfirmed — do not issue</option>
                    <option value="software_supplier">Software supplier / Sales Machine-Software</option>
                    <option value="esp">Electronic Invoicing Service Provider (ESP)</option>
                    <option value="both">Both routes</option>
                    <option value="other">Other — requires documented confirmation</option>
                  </select>
                </div>
                <label className="detail-item"><span>BIR accreditation reference</span><input value={taxpayerProfile.bir_accreditation_reference ?? ''} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, bir_accreditation_reference: event.target.value || null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
                <label className="detail-item"><span>Tenant Permit to Use reference</span><input value={taxpayerProfile.bir_permit_to_use_reference ?? ''} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, bir_permit_to_use_reference: event.target.value || null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
                <label className="detail-item"><span>Permit to Transmit reference</span><input value={taxpayerProfile.bir_permit_to_transmit_reference ?? ''} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, bir_permit_to_transmit_reference: event.target.value || null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
                <label className="detail-item"><span>Approved software version</span><input value={taxpayerProfile.approved_software_version ?? ''} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, approved_software_version: event.target.value || null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
                <label className="detail-item"><span>BIR approval recorded at</span><input type="datetime-local" value={taxpayerProfile.bir_approval_recorded_at ? new Date(taxpayerProfile.bir_approval_recorded_at).toISOString().slice(0,16) : ''} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, bir_approval_recorded_at: event.target.value ? new Date(event.target.value).toISOString() : null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
              </div>
              <label className="detail-item" style={{ display: 'grid', gap: 6, marginTop: 16 }}><span>Internal review note</span><textarea rows={3} value={taxpayerProfile.review_note ?? ''} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, review_note: event.target.value || null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
              {taxpayerProfile.reviewed_at && <p className="muted">Last platform review: {new Date(taxpayerProfile.reviewed_at).toLocaleString()}</p>}
              {taxpayerProfileError && <div className="error-banner">{taxpayerProfileError}</div>}
              {taxpayerProfileMessage && <div className="status-panel"><strong>{taxpayerProfileMessage}</strong></div>}
              {canManage && <div className="status-panel">
                <div><strong>Registration evidence</strong><span>Only record accreditation, PTU or Permit to Transmit references after checking the supporting official documents. The “Reviewed” status below means platform review, not BIR certification.</span></div>
                <button onClick={onRequestReviewSave} disabled={taxpayerProfileSaving || taxpayerProfileLoading}>{taxpayerProfileSaving ? 'Saving…' : 'Save profile review'}</button>
              </div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
