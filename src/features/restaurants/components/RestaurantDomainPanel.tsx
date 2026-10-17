type RestaurantDomainPanelProps = {
  domain: string;
  onDomainChange: (value: string) => void;
  canManage: boolean;
  domainSaving: boolean;
  domainError: string;
  onRequestSave: () => void;
};

export default function RestaurantDomainPanel({
  domain,
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
            <strong>{domain ? 'Custom domain configured' : 'No custom domain configured'}</strong>
            <span>
              {domain
                ? <>This restaurant is configured to use <strong>{domain}</strong>.</>
                : 'The restaurant is currently using its WEB2TABLE platform URL.'}
            </span>
          </div>
          <span className={domain ? 'status active' : 'status inactive'}>{domain ? 'Configured' : 'Not configured'}</span>
        </div>

        {canManage && <div className="domain-form">
          <label>
            Custom domain
            <input value={domain} onChange={(event) => onDomainChange(event.target.value)} placeholder="restaurant.com" />
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
          Add a custom domain only when one is available. Enter only the hostname, for example <strong>restaurant.com</strong>. Do not include https:// or a path.
        </div>
        {domainError && <div className="error-banner">{domainError}</div>}
      </div>
    </div>
  );
}
