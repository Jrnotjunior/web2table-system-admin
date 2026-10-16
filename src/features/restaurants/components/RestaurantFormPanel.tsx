import type { FormEvent } from 'react';

export type RestaurantFormValues = {
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  location_text: string;
  contact_number: string;
  email: string;
  is_active: boolean;
};

type RestaurantFormPanelProps = {
  form: RestaurantFormValues;
  updateForm: (field: keyof RestaurantFormValues, value: string | boolean) => void;
  editingRestaurant: boolean;
  saving: boolean;
  restaurantError: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function RestaurantFormPanel({
  form,
  updateForm,
  editingRestaurant,
  saving,
  restaurantError,
  onClose,
  onSubmit,
}: RestaurantFormPanelProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="restaurant-form-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">{editingRestaurant ? 'Restaurant' : 'New restaurant'}</div>
            <h2 id="restaurant-form-title">{editingRestaurant ? 'Edit restaurant' : 'Add restaurant'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} disabled={saving} aria-label="Close">×</button>
        </div>

        <form className="restaurant-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Restaurant name
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} required />
            </label>
            <label>
              Slug
              <input
                value={form.slug}
                onChange={(event) => updateForm('slug', event.target.value)}
                placeholder="my-restaurant"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                title="Use lowercase letters, numbers, and single hyphens."
                required
              />
            </label>
          </div>

          <label>
            Tagline
            <input value={form.tagline} onChange={(event) => updateForm('tagline', event.target.value)} placeholder="Fresh food, made for you." />
          </label>

          <label>
            Logo URL
            <input type="url" value={form.logo_url} onChange={(event) => updateForm('logo_url', event.target.value)} placeholder="https://..." />
          </label>

          <label>
            Location
            <input value={form.location_text} onChange={(event) => updateForm('location_text', event.target.value)} placeholder="Branch address or location" />
          </label>

          <div className="form-grid">
            <label>
              Contact number
              <input value={form.contact_number} onChange={(event) => updateForm('contact_number', event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
            </label>
          </div>

          <label className="toggle-row">
            <input className="toggle-input" type="checkbox" checked={form.is_active} onChange={(event) => updateForm('is_active', event.target.checked)} />
            <span className="toggle-switch" aria-hidden="true"><span /></span>
            <span className="toggle-label">{form.is_active ? 'Active' : 'Inactive'}</span>
          </label>

          {restaurantError && <div className="error-banner">{restaurantError}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingRestaurant ? 'Save changes' : 'Create restaurant'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
