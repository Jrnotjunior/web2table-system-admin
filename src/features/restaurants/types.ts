export type Restaurant = {
  id: string;
  owner_id: string | null;
  custom_domain: string | null;
  slug: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  location_text: string | null;
  contact_number: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RestaurantForm = {
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  location_text: string;
  contact_number: string;
  email: string;
  is_active: boolean;
};
