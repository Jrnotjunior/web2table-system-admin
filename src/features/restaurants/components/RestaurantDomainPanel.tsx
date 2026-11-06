type RestaurantDomainPanelProps = {
  restaurantName: string;
  restaurantSlug: string;
  customDomain: string | null;
};

export default function RestaurantDomainPanel({ restaurantName, restaurantSlug, customDomain }: RestaurantDomainPanelProps) {
  const activeDomain = customDomain?.trim() || 'app.web2table.io';
  const isCustomDomain = activeDomain !== 'app.web2table.io';
  const orderingUrl = `https://${activeDomain}/#order/${encodeURIComponent(restaurantSlug)}?branch=main`;

  return (
    <div className="manage-overview">
      <div className="overview-section">
        <div className="eyebrow">Restaurant ordering domain</div>
        <h3>Public ordering URL</h3>
        <p>{isCustomDomain ? 'This restaurant uses its own custom ordering domain.' : "This restaurant uses Web2Table's shared ordering domain. Each restaurant is identified by its own URL path."}</p>
        <div className="domain-status-panel">
          <div>
            <strong>{isCustomDomain ? 'Active custom domain' : 'Active Web2Table domain'}</strong>
            <span><strong>{activeDomain}</strong> is the ordering domain for {restaurantName}.</span>
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
          The URL uses this restaurant's unique identifier (<strong>{restaurantSlug}</strong>) and the default branch. {isCustomDomain ? 'Customers access the storefront through the restaurant’s custom domain.' : 'No separate domain registration is required for the standard Web2Table ordering address.'}
        </div>
      </div>
    </div>
  );
}
