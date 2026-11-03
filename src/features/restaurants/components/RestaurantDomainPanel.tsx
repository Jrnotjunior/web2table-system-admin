type RestaurantDomainPanelProps = {
  domain: string;
  platformDomain?: string;
  onDomainChange: (value: string) => void;
  canManage: boolean;
  domainSaving: boolean;
  domainError: string;
  onRequestSave: () => void;
};

export default function RestaurantDomainPanel({
  domain,
  platformDomain = 'app.web2table.io',
  onDomainChange,
  canManage,
  domainSaving,
  domainError,
  onRequestSave,
}: RestaurantDomainPanelProps) {
  return (
    <div className="manage-overview">
      <div className="overview-section">
        <div className="eyebrow">Custom Domain</div>
        <h3>Restaurant domain</h3>
        <p>Assign the public domain that will identify this restaurant on the ordering platform.</p>
        <div className="domain-status-panel">
          <div>
            <strong>{domain ? 'Custom domain configured' : 'Platform domain active'}</strong>
            <span>
              {domain
                ? <>Custom hostname requested: <strong>{domain}</strong>.</>
                : <>Customers can order using the Web2Table platform URL <strong>{platformDomain}</strong>. Add a custom domain below only if the restaurant owns a separate hostname.</>}
            </span>
          </div>
          <span className={domain ? 'status active' : 'status inactive'}>{domain ? 'Configured' : 'Not configured'}</span>
        </div>

        {canManage && <div className="domain-form">
          <label>
            Custom domain
            <input value={domain} onChange={(event) => onDomainChange(event.target.value)} placeholder="restaurant.com" autoComplete="off" />
          </label>
          <div className="domain-form-actions">
            <button onClick={onRequestSave} disabled={domainSaving || !domain.trim()}>
              {domainSaving ? 'Saving...' : 'Save domain'}
            </button>
            {domain.trim() && (
              <button
                type="button"
                className="secondary-button"
                disabled={domainSaving}
                onClick={() => {
                  onDomainChange('');
                  onRequestSave();
                }}
              >
                Remove domain
              </button>
            )}
          </div>
        </div>}
        {!canManage && <div className="empty-state">View Only access can view the domain configuration but cannot change it.</div>}
        <div className="domain-help">
          The platform domain is managed by Web2Table and must not be entered here. Add a custom domain only when one is available. Enter only the hostname, for example <strong>restaurant.com</strong>. Do not include https:// or a path.
        </div>
        {domainError && <div className="error-banner">{domainError}</div>}
      </div>
    </div>
  );
}
