type RestaurantSummary = {
 id: string; name: string; slug: string; logo_url: string | null; custom_domain: string | null;
};
type ManageTab = 'overview' | 'owner' | 'domain' | 'settings' | 'staff' | 'package';
type Props = {
 restaurant: RestaurantSummary;
 manageTab: ManageTab;
 onSelectTab: (tab: ManageTab) => void;
 onClose: () => void;
 onLoadOwner: () => void;
 onSelectDomain: () => void;
 onLoadSettings: () => void;
 onLoadStaff: () => void;
 onLoadPackage: () => void;
};
export default function RestaurantManagementHeader({ restaurant, manageTab, onSelectTab, onClose, onLoadOwner, onSelectDomain, onLoadSettings, onLoadStaff, onLoadPackage }: Props) {
 return <>
  <div className="restaurant-manage-hero">
   <div className="restaurant-hero-main">
    <div className="restaurant-hero-logo">{restaurant.logo_url ? <img src={restaurant.logo_url} alt="" /> : <span>{restaurant.name.charAt(0).toUpperCase()}</span>}</div>
    <div><div className="eyebrow">Restaurant Management</div><h2>{restaurant.name}</h2><div className="restaurant-slug">/{restaurant.slug}</div></div>
   </div>
   <div className="restaurant-hero-actions"><button className="icon-button restaurant-manage-close" type="button" onClick={onClose} aria-label="Close restaurant management" title="Back to restaurants">×</button></div>
  </div>
  <nav className="manage-tabs" aria-label="Restaurant management sections">
   <button className={`manage-tab ${manageTab === 'overview' ? 'active' : ''}`} type="button" onClick={() => onSelectTab('overview')}>Overview</button>
   <button className={`manage-tab ${manageTab === 'owner' ? 'active' : ''}`} type="button" onClick={() => { onSelectTab('owner'); onLoadOwner(); }}>Owner</button>
   <button className={`manage-tab ${manageTab === 'domain' ? 'active' : ''}`} type="button" onClick={() => { onSelectTab('domain'); onSelectDomain(); }}>Domain</button>
   <button className={`manage-tab ${manageTab === 'settings' ? 'active' : ''}`} type="button" onClick={() => { onSelectTab('settings'); onLoadSettings(); }}>Settings</button>
   <button className={`manage-tab ${manageTab === 'staff' ? 'active' : ''}`} type="button" onClick={() => { onSelectTab('staff'); onLoadStaff(); }}>Staff</button>
   <button className={`manage-tab ${manageTab === 'package' ? 'active' : ''}`} type="button" onClick={() => { onSelectTab('package'); onLoadPackage(); }}>Package</button>
  </nav>
 </>;
}
