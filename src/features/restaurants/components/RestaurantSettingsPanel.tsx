import { useState } from 'react';
import type { BirIssuanceReadiness, DisabledInvoiceSeriesInput, TaxpayerProfileReview } from '../services/restaurantSettingsService';

function formatDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

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
  birReadinessLoading: boolean;
  birReadiness: BirIssuanceReadiness | null;
  birReadinessError: string;
  invoiceSeriesSaving: boolean;
  invoiceSeriesError: string;
  invoiceSeriesMessage: string;
  onConfigureDisabledInvoiceSeries: (input: DisabledInvoiceSeriesInput) => void;
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
  birReadinessLoading,
  birReadiness,
  birReadinessError,
  invoiceSeriesSaving,
  invoiceSeriesError,
  invoiceSeriesMessage,
  onConfigureDisabledInvoiceSeries,
}: RestaurantSettingsPanelProps) {
  const [invoiceBranchCode, setInvoiceBranchCode] = useState('');
  const [invoiceDocumentType, setInvoiceDocumentType] = useState<DisabledInvoiceSeriesInput['documentType']>('sales_invoice');
  const [invoiceInitialSerial, setInvoiceInitialSerial] = useState('');
  const [invoiceNextSerial, setInvoiceNextSerial] = useState('');

  function submitDisabledInvoiceSeries(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const initialSerial = Number(invoiceInitialSerial);
    const nextSerial = Number(invoiceNextSerial);
    if (!Number.isSafeInteger(initialSerial) || initialSerial <= 0 || !Number.isSafeInteger(nextSerial) || nextSerial < initialSerial) return;
    onConfigureDisabledInvoiceSeries({
      branchCode: invoiceBranchCode,
      documentType: invoiceDocumentType,
      initialSerial,
      nextSerial,
    });
  }

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
          <h3>Official invoice issuance gate</h3>
          <p>This control reports platform readiness only. Official invoice issuance is intentionally disabled while the applicable BIR route, approved invoice rules, required reports and release acceptance remain incomplete.</p>
          <div className="status-panel" style={{ borderColor: '#b91c1c' }}>
            <div>
              <strong style={{ color: '#b91c1c' }}>OFF — Official BIR invoice issuance</strong>
              <span>Web2Table is not currently represented as BIR-accredited. Operational POS receipts must not be treated as official BIR invoices.</span>
            </div>
          </div>
          {birReadinessLoading ? <div className="empty-state">Checking readiness…</div> : birReadinessError ? (
            <div className="error-banner">{birReadinessError}</div>
          ) : birReadiness ? (
            <>
              <div className="detail-grid" style={{ marginTop: 12 }}>
                <div className="detail-item"><span>Taxpayer profile</span><strong>{birReadiness.taxpayer_profile_status.replaceAll('_', ' ')}</strong></div>
                <div className="detail-item"><span>Regulatory route</span><strong>{birReadiness.regulatory_route.replaceAll('_', ' ')}</strong></div>
                <div className="detail-item"><span>Taxpayer identity complete</span><strong>{birReadiness.taxpayer_identity_complete ? 'Yes' : 'No'}</strong></div>
                <div className="detail-item"><span>Route evidence recorded</span><strong>{birReadiness.route_evidence_recorded ? 'Yes — still requires document verification' : 'No'}</strong></div>
                <div className="detail-item"><span>Configured serial series</span><strong>{birReadiness.configured_series_count}</strong></div>
                <div className="detail-item"><span>Enabled serial series</span><strong>{birReadiness.enabled_series_count}</strong></div>
                <div className="detail-item"><span>Documents issued by ledger</span><strong>{birReadiness.issued_document_count}</strong></div>
                <div className="detail-item"><span>Unclassified menu products</span><strong>{birReadiness.unclassified_product_count}</strong></div>
                <div className="detail-item"><span>Completed sales needing tax review</span><strong>{birReadiness.completed_orders_needing_tax_review}</strong></div>
              </div>
              <h4 style={{ margin: '18px 0 8px' }}>Remaining blockers</h4>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                {birReadiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
              <section style={{ marginTop: 20, padding: 16, border: '1px solid var(--border, #dce2ea)', borderRadius: 10 }}>
                <h4 style={{ margin: '0 0 6px' }}>Configure serial series (keep disabled)</h4>
                <p className="muted">Use only the official, authorized starting serial from the tenant's applicable permit/approval documents. This records the series for planning and keeps <strong>invoice issuance OFF</strong>. It does not generate or authorize invoices.</p>
                <form onSubmit={submitDisabledInvoiceSeries} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <label className="detail-item"><span>Branch code</span><input value={invoiceBranchCode} maxLength={64} onChange={(event) => setInvoiceBranchCode(event.target.value)} disabled={!canManage || invoiceSeriesSaving} placeholder="e.g. 00000" /></label>
                  <label className="detail-item"><span>Document type</span><select value={invoiceDocumentType} onChange={(event) => setInvoiceDocumentType(event.target.value as DisabledInvoiceSeriesInput['documentType'])} disabled={!canManage || invoiceSeriesSaving}>
                    <option value="sales_invoice">Sales Invoice</option>
                    <option value="invoice">Invoice</option>
                    <option value="cash_invoice">Cash Invoice</option>
                    <option value="credit_invoice">Credit Invoice</option>
                    <option value="service_invoice">Service Invoice</option>
                  </select></label>
                  <label className="detail-item"><span>Authorized initial serial</span><input type="number" min="1" step="1" value={invoiceInitialSerial} onChange={(event) => setInvoiceInitialSerial(event.target.value)} disabled={!canManage || invoiceSeriesSaving} required /></label>
                  <label className="detail-item"><span>Next serial</span><input type="number" min="1" step="1" value={invoiceNextSerial} onChange={(event) => setInvoiceNextSerial(event.target.value)} disabled={!canManage || invoiceSeriesSaving} required /></label>
                  {canManage && <div style={{ display: 'flex', alignItems: 'end' }}><button type="submit" disabled={invoiceSeriesSaving || birReadinessLoading || !birReadiness || !birReadiness.route_evidence_recorded || birReadiness.taxpayer_profile_status !== 'reviewed'}>{invoiceSeriesSaving ? 'Saving…' : 'Save disabled series'}</button></div>}
                </form>
                {invoiceSeriesError && <div className="error-banner" role="alert" style={{ marginTop: 12 }}>{invoiceSeriesError}</div>}
                {invoiceSeriesMessage && <p className="muted" role="status" style={{ marginTop: 12 }}>{invoiceSeriesMessage}</p>}
                <p className="muted" style={{ marginTop: 8 }}>The form stays disabled until the taxpayer profile has platform review and route-specific approval references recorded. A separate approved release is still required before any invoice can be issued.</p>
              </section>
              <p className="muted" style={{ marginTop: 12 }}>{birReadiness.notice}</p>
            </>
          ) : <div className="empty-state">Readiness status was not returned.</div>}
        </div>

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
                    <option value="draft" disabled>Draft — waiting for owner submission</option>
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
                <label className="detail-item"><span>BIR approval recorded at</span><input type="datetime-local" value={formatDateTimeLocal(taxpayerProfile.bir_approval_recorded_at)} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, bir_approval_recorded_at: event.target.value ? new Date(event.target.value).toISOString() : null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
              </div>
              <label className="detail-item" style={{ display: 'grid', gap: 6, marginTop: 16 }}><span>Review note for tenant (visible to restaurant owner)</span><textarea rows={3} value={taxpayerProfile.review_note ?? ''} onChange={(event) => onTaxpayerProfileChange({ ...taxpayerProfile, review_note: event.target.value || null })} disabled={!canManage || taxpayerProfileSaving || taxpayerProfileLoading} /></label>
              {taxpayerProfile.reviewed_at && <p className="muted">Last platform review: {new Date(taxpayerProfile.reviewed_at).toLocaleString()}</p>}
              {taxpayerProfileError && <div className="error-banner">{taxpayerProfileError}</div>}
              {taxpayerProfileMessage && <div className="status-panel"><strong>{taxpayerProfileMessage}</strong></div>}
              {canManage && <div className="status-panel">
                <div><strong>Registration evidence</strong><span>Only record accreditation, PTU or Permit to Transmit references after checking the supporting official documents. The “Reviewed” status below means platform review, not BIR certification.</span></div>
                <button onClick={onRequestReviewSave} disabled={taxpayerProfileSaving || taxpayerProfileLoading || taxpayerProfile.profile_status === 'draft'}>{taxpayerProfileSaving ? 'Saving…' : 'Save profile review'}</button>
              </div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
