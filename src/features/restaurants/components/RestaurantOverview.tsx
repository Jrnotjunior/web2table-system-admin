type RestaurantOverviewData = {
 name: string; slug: string; tagline: string; restaurant_address: string | null; contact_number: string | null;
 email: string | null; custom_domain: string | null; created_at: string; is_active: boolean;
};
type Props = {
 restaurant: RestaurantOverviewData;
 canManage: boolean;
 onRequestStatusChange: () => void;
};
export default function RestaurantOverview({ restaurant, canManage, onRequestStatusChange }: Props) {
 return <div className="manage-overview">
  <div className="overview-section">
   <div className="eyebrow">Restaurant Information</div><h3>Basic details</h3>
   <div className="detail-grid">
    <div className="detail-item"><span>Restaurant name</span><strong>{restaurant.name}</strong></div>
    <div className="detail-item"><span>Slug</span><strong>/{restaurant.slug}</strong></div>
    <div className="detail-item"><span>Tagline</span><strong>{restaurant.tagline || '—'}</strong></div>
    <div className="detail-item"><span>Location</span><strong>{restaurant.restaurant_address || '—'}</strong></div>
    <div className="detail-item"><span>Contact number</span><strong>{restaurant.contact_number || '—'}</strong></div>
    <div className="detail-item"><span>Email</span><strong>{restaurant.email || '—'}</strong></div>
    <div className="detail-item"><span>Custom domain</span><strong>{restaurant.custom_domain || 'Not configured'}</strong></div>
    <div className="detail-item"><span>Created</span><strong>{new Date(restaurant.created_at).toLocaleDateString()}</strong></div>
   </div>
  </div>
  <div className="overview-section restaurant-access-section">
   <div className="eyebrow">Platform Status</div><h3>Restaurant access</h3>
   <div className="status-panel restaurant-access-status-panel">
    <div><strong>{restaurant.is_active ? 'Restaurant is active' : 'Restaurant is inactive'}</strong><span>{restaurant.is_active ? 'Customers can access this restaurant.' : 'Customers cannot access this restaurant while inactive.'}</span></div>
    {canManage && <button className={restaurant.is_active ? 'danger-button' : 'secondary-button'} onClick={onRequestStatusChange}>{restaurant.is_active ? 'Deactivate restaurant' : 'Activate restaurant'}</button>}
   </div>
  </div>
 </div>;
}
