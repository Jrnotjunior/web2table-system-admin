type RestaurantSettingsConfirmationProps = {
  restaurantName: string;
  settingsSaving: boolean;
  settingsError: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function RestaurantSettingsConfirmation({
  restaurantName,
  settingsSaving,
  settingsError,
  onClose,
  onConfirm,
}: RestaurantSettingsConfirmationProps) {
  return (
    <div className="modal-backdrop settings-confirm-backdrop" role="presentation">
      <section className="modal-card settings-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="save-settings-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Save Settings</div>
            <h2 id="save-settings-title">Apply these settings?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={settingsSaving} aria-label="Close">
            ×
          </button>
        </div>

        <div className="settings-confirm-content">
          <p>You are about to update the operational settings for <strong>{restaurantName}</strong>.</p>
          <div className="settings-confirm-warning">
            <strong>This will immediately change how this restaurant handles these settings.</strong>
            <span>Review the VAT, payment, and rider assignment settings before confirming.</span>
          </div>
          {settingsError && <div className="error-banner">{settingsError}</div>}
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={settingsSaving}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={settingsSaving}>
            {settingsSaving ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </section>
    </div>
  );
}
