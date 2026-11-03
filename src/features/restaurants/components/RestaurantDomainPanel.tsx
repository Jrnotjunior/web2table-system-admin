type RestaurantDomainPanelProps = {
  restaurantName: string;
  restaurantSlug: string;
};

export default function RestaurantDomainPanel({ restaurantName, restaurantSlug }: RestaurantDomainPanelProps) {
  const orderingUrl = `https://app.web2table.io/#order/${encodeURIComponent(restaurantSlug)}?branch=main`;

  return (
    <div className="manage-overview">
      <div className="overview-section">
        <div className="eyebrow">Restaurant ordering domain</div>
        <h3>Public ordering URL</h3>
        <p>This restaurant uses Web2Table's shared ordering domain. Each restaurant is identified by its own URL path.</p>
        <div className="domain-status-panel">
          <div>
            <strong>Active Web2Table domain</strong>
            <span><strong>app.web2table.io</strong> is the ordering domain for {restaurantName}.</span>
          </div>
          <span className="status active">Active</span>
        </div>
        <div className="domain-form">
          <label>
            Restaurant ordering URL
            <input readOnly value={orderingUrl} aria-label="Restaurant ordering URL" />
          </label>
          <div className="domain-form-actions">
            <button type="button" onClick={() => void navigator.clipboard?.writeText(orderingUrl)}>
              Copy ordering URL
            </button>
          </div>
        </div>
        <div className="domain-help">
          The URL uses this restaurant's unique identifier (<strong>{restaurantSlug}</strong>) and the default branch. No separate domain registration is required for the standard Web2Table ordering address.
        </div>
      </div>
    </div>
  );
}
