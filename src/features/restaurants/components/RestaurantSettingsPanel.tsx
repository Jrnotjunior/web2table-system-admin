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
  onCashOnDeliveryChange: (value: boolean) => void;
  onCashOnPickupChange: (value: boolean) => void;
  automaticRiderAssignmentEnabled: boolean;
  onAutomaticRiderAssignmentChange: (value: boolean) => void;
  settingsError: string;
  settingsSaving: boolean;
  onRequestSave: () => void;
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
  automaticRiderAssignmentEnabled,
  onAutomaticRiderAssignmentChange,
  settingsError,
  settingsSaving,
  onRequestSave,
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
                <span>Cash for Pickup &amp; Take-out</span>
                <label className="toggle-row">
                  <input className="toggle-input" type="checkbox" checked={cashOnPickupEnabled} onChange={(event) => onCashOnPickupChange(event.target.checked)} disabled={!canManage} />
                  <span className="toggle-switch" aria-hidden="true"><span /></span>
                  <span className="toggle-label">{cashOnPickupEnabled ? "Enabled" : "Disabled"}</span>
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
      </div>
    </div>
  );
}
