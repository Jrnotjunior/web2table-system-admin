import { supabase } from '../../../lib/supabase';

export type RestaurantSettingsUpdate = {
  cashOnDeliveryEnabled: boolean;
  cashOnPickupEnabled: boolean;
  cashOnTakeOutEnabled: boolean;
  automaticRiderAssignmentEnabled: boolean;
  vatRegistered: boolean;
  pricesVatInclusive: boolean;
  vatRate: number;
};

export async function fetchRestaurantSettings(restaurantId: string) {
  return supabase.rpc('system_admin_get_restaurant_settings', {
    p_restaurant_id: restaurantId,
  });
}

export async function updateRestaurantSettings(
  restaurantId: string,
  settings: RestaurantSettingsUpdate,
) {
  return supabase.rpc('system_admin_update_restaurant_settings', {
    p_restaurant_id: restaurantId,
    p_cash_on_delivery_enabled: settings.cashOnDeliveryEnabled,
    p_cash_on_pickup_enabled: settings.cashOnPickupEnabled,
    p_cash_on_take_out_enabled: settings.cashOnTakeOutEnabled,
    p_automatic_rider_assignment_enabled: settings.automaticRiderAssignmentEnabled,
    p_tax_vat_registered: settings.vatRegistered,
    p_tax_prices_vat_inclusive: settings.pricesVatInclusive,
    p_tax_vat_rate: settings.vatRate,
  });
}


export async function fetchOnlinePaymentsEnabled(restaurantId: string) {
  return supabase.rpc('system_admin_get_online_payments_enabled', { p_restaurant_id: restaurantId });
}

export async function updateOnlinePaymentsEnabled(restaurantId: string, enabled: boolean) {
  return supabase.rpc('system_admin_set_online_payments_enabled', { p_restaurant_id: restaurantId, p_enabled: enabled });
}


export type TaxpayerProfileReview = {
  restaurant_id: string;
  registered_legal_name: string | null;
  trade_name: string | null;
  tin: string | null;
  registered_address: string | null;
  branch_code: string | null;
  taxpayer_category: 'micro' | 'small' | 'medium' | 'large' | 'large_taxpayer' | 'unknown';
  profile_status: 'draft' | 'submitted_for_review' | 'needs_correction' | 'reviewed';
  review_note: string | null;
  reviewed_at: string | null;
  bir_route_status: 'unconfirmed' | 'software_supplier' | 'esp' | 'both' | 'other';
  bir_accreditation_reference: string | null;
  bir_permit_to_use_reference: string | null;
  bir_permit_to_transmit_reference: string | null;
  approved_software_version: string | null;
  bir_approval_recorded_at: string | null;
};

export type TaxpayerProfileReviewUpdate = Pick<
  TaxpayerProfileReview,
  | 'profile_status'
  | 'review_note'
  | 'bir_route_status'
  | 'bir_accreditation_reference'
  | 'bir_permit_to_use_reference'
  | 'bir_permit_to_transmit_reference'
  | 'approved_software_version'
  | 'bir_approval_recorded_at'
>;

export async function fetchTaxpayerProfile(restaurantId: string) {
  return supabase.rpc('get_restaurant_taxpayer_profile', { p_restaurant_id: restaurantId });
}

export async function reviewTaxpayerProfile(restaurantId: string, profile: TaxpayerProfileReviewUpdate) {
  return supabase.rpc('system_admin_review_restaurant_taxpayer_profile', {
    p_restaurant_id: restaurantId,
    p_profile_status: profile.profile_status,
    p_review_note: profile.review_note,
    p_bir_route_status: profile.bir_route_status,
    p_bir_accreditation_reference: profile.bir_accreditation_reference,
    p_bir_permit_to_use_reference: profile.bir_permit_to_use_reference,
    p_bir_permit_to_transmit_reference: profile.bir_permit_to_transmit_reference,
    p_approved_software_version: profile.approved_software_version,
    p_bir_approval_recorded_at: profile.bir_approval_recorded_at,
  });
}


export type BirIssuanceReadiness = {
  restaurant_id: string;
  taxpayer_profile_exists: boolean;
  taxpayer_identity_complete: boolean;
  taxpayer_profile_status: string;
  regulatory_route: string;
  route_evidence_recorded: boolean;
  configured_series_count: number;
  enabled_series_count: number;
  issued_document_count: number;
  serial_series: Array<{ branch_code: string; document_type: string; initial_serial: string | null; next_serial: string | null; regulatory_route: string; issuance_enabled: boolean; configured_at: string | null }>;
  unclassified_product_count: number;
  completed_orders_needing_tax_review: number;
  official_invoice_issuance_api_enabled: false;
  is_bir_accredited: false;
  blockers: string[];
  notice: string;
};

export async function fetchBirIssuanceReadiness(restaurantId: string) {
  return supabase.rpc('get_restaurant_bir_issuance_readiness', {
    p_restaurant_id: restaurantId,
  });
}


export type DisabledInvoiceSeriesInput = {
  branchCode: string;
  documentType: 'invoice' | 'sales_invoice' | 'cash_invoice' | 'credit_invoice' | 'service_invoice';
  initialSerial: number;
  nextSerial: number;
};

export async function configureDisabledInvoiceSeries(restaurantId: string, input: DisabledInvoiceSeriesInput) {
  return supabase.rpc('system_admin_configure_disabled_invoice_series', {
    p_restaurant_id: restaurantId,
    p_branch_code: input.branchCode,
    p_document_type: input.documentType,
    p_initial_serial: input.initialSerial,
    p_next_serial: input.nextSerial,
  });
}
