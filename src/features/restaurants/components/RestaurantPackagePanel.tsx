export type RestaurantPackageModule = {
  package_id: number | null;
  package_key: string | null;
  package_name: string | null;
  package_description: string | null;
  subscription_status: string;
  module_key: string;
  module_name: string;
  included_by_package: boolean;
  override_enabled: boolean | null;
  effective_enabled: boolean;
};

type RestaurantPackagePanelProps = {
  canManage: boolean;
  packageLoading: boolean;
  packageSaving: boolean;
  packageError: string;
  restaurantPackageId: number | null;
  restaurantPackageRows: RestaurantPackageModule[];
  onAssignPackage: (packageId: number) => void;
  onSetModuleEnabled: (moduleKey: string, enabled: boolean) => void;
};

export default function RestaurantPackagePanel({
  canManage,
  packageLoading,
  packageSaving,
  packageError,
  restaurantPackageId,
  restaurantPackageRows,
  onAssignPackage,
  onSetModuleEnabled,
}: RestaurantPackagePanelProps) {
  return (
    <div className="manage-overview package-access-page">
      <div className="overview-section package-access-section">
        <div className="eyebrow">Package & Access</div>
        <h3>Restaurant package</h3>
        <p>Choose the package for this restaurant. The package automatically controls the available modules; individual included modules can be disabled when needed.</p>

        {packageLoading ? (
          <div className="empty-state">Loading package...</div>
        ) : (
          <>
            {packageError && <div className="error-banner">{packageError}</div>}

            <div className="status-panel package-current-panel">
              <div>
                <strong>{restaurantPackageRows[0]?.package_name || 'No package assigned'}</strong>
                <span>{restaurantPackageRows[0]?.package_description || 'Assign a package to activate restaurant modules.'}</span>
              </div>
              <span className={restaurantPackageRows[0]?.subscription_status === 'active' ? 'status active' : 'status inactive'}>
                {restaurantPackageRows[0]?.subscription_status === 'active' ? 'Active' : 'Not assigned'}
              </span>
            </div>

            {canManage && (
              <div className="domain-form package-selector">
                <label>
                  Package
                  <select
                    value={restaurantPackageId ?? ''}
                    onChange={(event) => {
                      const nextPackageId = Number(event.target.value);
                      if (Number.isInteger(nextPackageId) && nextPackageId > 0) {
                        onAssignPackage(nextPackageId);
                      }
                    }}
                    disabled={packageSaving}
                  >
                    <option value="" disabled>Select a package</option>
                    <option value="1">1 — Full System</option>
                    <option value="2">2 — Self Ordering + POS</option>
                    <option value="3">3 — POS</option>
                    <option value="4">4 — Self Ordering + POS + Kitchen</option>
                    <option value="5">5 — Dispatch + Delivery</option>
                    <option value="6">6 — Self Ordering + Kitchen</option>
                    <option value="7">7 — POS + Delivery</option>
                  </select>
                </label>
              </div>
            )}

            <div className="overview-section package-modules-section">
              <div className="eyebrow">Included Modules</div>
              <h3>Module access</h3>
              <div className="detail-grid">
                {restaurantPackageRows.map((module) => (
                  <div className="detail-item" key={module.module_key}>
                    <span>{module.module_name}</span>
                    <label className="toggle-row">
                      <input
                        className="toggle-input"
                        type="checkbox"
                        checked={module.effective_enabled}
                        onChange={(event) => onSetModuleEnabled(module.module_key, event.target.checked)}
                        disabled={!canManage || !module.included_by_package || packageSaving}
                      />
                      <span className="toggle-switch" aria-hidden="true"><span /></span>
                      <span className="toggle-label">
                        {!module.included_by_package
                          ? 'Not included'
                          : module.effective_enabled
                            ? 'Enabled'
                            : 'Disabled'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="status-panel package-controls-panel">
              <div>
                <strong>Package controls</strong>
                <span>{canManage ? 'Changing the package resets module overrides to the package defaults.' : 'View Only access can review the package but cannot change access.'}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
