type RestaurantOwnerAssignmentConfirmationProps = {
  restaurantName: string;
  ownerEmail: string;
  ownerSaving: boolean;
  ownerError: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function RestaurantOwnerAssignmentConfirmation({
  restaurantName,
  ownerEmail,
  ownerSaving,
  ownerError,
  onClose,
  onConfirm,
}: RestaurantOwnerAssignmentConfirmationProps) {
  return (
    <div className="modal-backdrop owner-confirm-backdrop" role="presentation">
      <section className="modal-card owner-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="assign-owner-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Assign Owner</div>
            <h2 id="assign-owner-title">Assign this owner?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={ownerSaving} aria-label="Close">×</button>
        </div>
        <div className="owner-confirm-content">
          <p>You are about to assign <strong>{ownerEmail.trim()}</strong> as the owner of <strong>{restaurantName}</strong>.</p>
          <div className="owner-confirm-warning">
            <strong>This will assign the restaurant owner.</strong>
            <span>If the email already has an account, it will be assigned. If not, Web2Table will send an invitation to create an account.</span>
          </div>
          {ownerError && <div className="error-banner">{ownerError}</div>}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={ownerSaving}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={ownerSaving}>{ownerSaving ? 'Processing...' : 'Confirm & Assign / Invite'}</button>
        </div>
      </section>
    </div>
  );
}
