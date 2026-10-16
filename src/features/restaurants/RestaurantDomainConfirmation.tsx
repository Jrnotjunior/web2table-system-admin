type RestaurantDomainConfirmationProps = {
  restaurantName: string;
  domain: string;
  domainSaving: boolean;
  domainError: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function RestaurantDomainConfirmation({
  restaurantName,
  domain,
  domainSaving,
  domainError,
  onClose,
  onConfirm,
}: RestaurantDomainConfirmationProps) {
  return (
    <div className="modal-backdrop domain-confirm-backdrop" role="presentation">
      <section className="modal-card domain-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="save-domain-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Save Domain</div>
            <h2 id="save-domain-title">Apply this domain?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={domainSaving} aria-label="Close">×</button>
        </div>
        <div className="domain-confirm-content">
          <p>You are about to set the public domain for <strong>{restaurantName}</strong> to <strong>{domain.trim().toLowerCase()}</strong>.</p>
          <div className="domain-confirm-warning">
            <strong>This will change the restaurant's public domain configuration.</strong>
            <span>Use only the hostname, such as restaurant.com. Do not include https:// or a path.</span>
          </div>
          {domainError && <div className="error-banner">{domainError}</div>}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={domainSaving}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={domainSaving}>{domainSaving ? 'Saving...' : 'Confirm & Save'}</button>
        </div>
      </section>
    </div>
  );
}
