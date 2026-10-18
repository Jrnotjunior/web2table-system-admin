export type Restaurant = {
  id: string;
  owner_id: string | null;
  custom_domain: string | null;
  slug: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  restaurant_address: string | null;
  contact_number: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RestaurantPackageRow = {
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

export type RestaurantStaff = {
  id: string;
  name: string;
  mobile_number: string;
  email: string;
  role: string;
  is_active: boolean;
  auth_user_id: string | null;
};
