import type { Restaurant } from './types';

type Props = {
  restaurants: Restaurant[];
  filteredRestaurants: Restaurant[];
  search: string;
  onSearchChange: (value: string) => void;
  accessLevel: 'owner' | 'administrator' | 'view_only' | null;
  canManage: boolean;
  loading: boolean;
  error: string;
  onInviteTenant: () => void;
  onManage: (restaurant: Restaurant) => void;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (restaurant: Restaurant) => void;
};

export type { Restaurant } from './types';

export default function RestaurantsPage({ restaurants, filteredRestaurants, search, onSearchChange, accessLevel, canManage, loading, error, onInviteTenant, onManage, onEdit, onDelete }: Props) {
  return (
    <section className="dashboard-card">
      <div className="stats-row">
        <div className="stat-card"><span>Total restaurants</span><strong>{restaurants.length}</strong></div>
        <div className="stat-card"><span>Active</span><strong>{restaurants.filter((restaurant) => restaurant.is_active).length}</strong></div>
        <div className="stat-card"><span>Inactive</span><strong>{restaurants.filter((restaurant) => !restaurant.is_active).length}</strong></div>
      </div>
      <div className="toolbar restaurants-search-toolbar">
        <input className="search-input uniform-search-input" type="search" placeholder="Search restaurants..." value={search} onChange={(event) => onSearchChange(event.target.value)} />
        <span className="live-indicator"><span className="live-dot" /> Live</span>
        {accessLevel === 'owner' && <button className="restaurants-invite-button" onClick={onInviteTenant}>Invite tenant</button>}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="empty-state">Loading restaurants...</div> : filteredRestaurants.length === 0 ? (
        <div className="empty-state"><strong>{restaurants.length === 0 ? 'No restaurants yet' : 'No matching restaurants'}</strong><span>{restaurants.length === 0 ? 'Add the first restaurant to start building the platform.' : 'Try a different search term.'}</span></div>
      ) : (
        <div className="restaurant-list">
          {filteredRestaurants.map((restaurant) => (
            <article className="restaurant-row" key={restaurant.id}>
              <div className="restaurant-main">
                <div className="restaurant-logo">{restaurant.logo_url ? <img src={restaurant.logo_url} alt="" /> : <span>{restaurant.name.charAt(0).toUpperCase()}</span>}</div>
                <div>
                  <div className="restaurant-title-line"><h3>{restaurant.name}</h3><span className={restaurant.is_active ? 'status active' : 'status inactive'}>{restaurant.is_active ? 'Active' : 'Inactive'}</span></div>
                  <div className="restaurant-slug">/{restaurant.slug}</div>
                  {restaurant.tagline && <p>{restaurant.tagline}</p>}
                  <div className="restaurant-meta">{restaurant.location_text && <span>{restaurant.location_text}</span>}{restaurant.email && <span>{restaurant.email}</span>}{restaurant.contact_number && <span>{restaurant.contact_number}</span>}</div>
                </div>
              </div>
              <div className="row-actions">
                <button className="secondary-button" onClick={() => onManage(restaurant)}>Manage</button>
                {canManage && <button className="secondary-button" onClick={() => onEdit(restaurant)}>Edit</button>}
                {canManage && <button type="button" className="danger-button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onDelete(restaurant); }}>Delete</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
