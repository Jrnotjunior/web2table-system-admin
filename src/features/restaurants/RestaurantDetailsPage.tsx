import type { ComponentProps } from 'react';
import type { Restaurant } from './types';
import RestaurantManagementHeader from './components/RestaurantManagementHeader';
import RestaurantOverview from './components/RestaurantOverview';
import RestaurantOwnerPanel from './components/RestaurantOwnerPanel';
import RestaurantDomainPanel from './components/RestaurantDomainPanel';
import RestaurantSettingsPanel from './components/RestaurantSettingsPanel';
import RestaurantStaffPanel from './components/RestaurantStaffPanel';
import PosIntegrationPanel from './components/PosIntegrationPanel';
import BranchManagementPanel from './components/BranchManagementPanel';

type HeaderProps = ComponentProps<typeof RestaurantManagementHeader>;
type OwnerProps = ComponentProps<typeof RestaurantOwnerPanel>;
type StaffProps = ComponentProps<typeof RestaurantStaffPanel>;
type SettingsProps = ComponentProps<typeof RestaurantSettingsPanel>;

type Props = {
  restaurant: Restaurant;
  canManage: boolean;
  manageTab: HeaderProps['manageTab'];
  onSelectTab: HeaderProps['onSelectTab'];
  onClose: HeaderProps['onClose'];
  onLoadOwner: HeaderProps['onLoadOwner'];
  onSelectDomain: HeaderProps['onSelectDomain'];
  onLoadSettings: HeaderProps['onLoadSettings'];
  onLoadStaff: HeaderProps['onLoadStaff'];
  onLoadPos: HeaderProps['onLoadPos'];
  posIntegration: { status: import('./services/posIntegrationService').PosIntegrationStatus; loading: boolean; saving: boolean; error: string; message: string };
  onSetPosIntegration: (action: import('./services/posIntegrationService').PosIntegrationAction, reason: string) => void;
  onRequestStatusChange: () => void;
  owner: Pick<OwnerProps, 'loading' | 'ownerUserId' | 'ownerName' | 'ownerEmail' | 'ownerSaving' | 'error'>;
  onOwnerEmailChange: OwnerProps['onEmailChange'];
  onRequestAssignOwner: OwnerProps['onRequestAssign'];
  onRequestRemoveOwner: OwnerProps['onRequestRemove'];
  staffState: Pick<StaffProps, 'staffLoading' | 'staffError' | 'restaurantStaff' | 'staffActionError' | 'staffActionId'>;
  onSetStaffActive: StaffProps['onSetStaffActive'];
  onRequestDeleteStaff: StaffProps['onRequestDelete'];
  settingsState: Pick<SettingsProps, 'settingsLoading' | 'cashOnDeliveryEnabled' | 'cashOnPickupEnabled' | 'automaticRiderAssignmentEnabled' | 'onlinePaymentsEnabled' | 'settingsError' | 'settingsSaving'>;
  onCashOnDeliveryChange: SettingsProps['onCashOnDeliveryChange'];
  onCashOnPickupChange: SettingsProps['onCashOnPickupChange'];
  onAutomaticRiderAssignmentChange: SettingsProps['onAutomaticRiderAssignmentChange'];
  onOnlinePaymentsEnabledChange: SettingsProps['onOnlinePaymentsEnabledChange'];
  onRequestSaveSettings: () => void;
};

export default function RestaurantDetailsPage(p: Props) {
  return (
    <section className="dashboard-card restaurant-manage-card">
      <RestaurantManagementHeader restaurant={p.restaurant} manageTab={p.manageTab} onSelectTab={p.onSelectTab} onClose={p.onClose} onLoadOwner={p.onLoadOwner} onSelectDomain={p.onSelectDomain} onLoadSettings={p.onLoadSettings} onLoadStaff={p.onLoadStaff} onLoadPos={p.onLoadPos} />
      {p.manageTab === 'pos' ? (
        <PosIntegrationPanel restaurant={p.restaurant} status={p.posIntegration.status} loading={p.posIntegration.loading} saving={p.posIntegration.saving} error={p.posIntegration.error} message={p.posIntegration.message} canManage={p.canManage} onAction={p.onSetPosIntegration} />
      ) : p.manageTab === 'branches' ? (
        <BranchManagementPanel tenantId={p.restaurant.id} canManage={p.canManage} />
      ) : p.manageTab === 'overview' ? (
        <RestaurantOverview restaurant={p.restaurant} canManage={p.canManage} onRequestStatusChange={p.onRequestStatusChange} />
      ) : p.manageTab === 'owner' ? (
        <RestaurantOwnerPanel loading={p.owner.loading} ownerUserId={p.owner.ownerUserId} ownerName={p.owner.ownerName} ownerEmail={p.owner.ownerEmail} canManage={p.canManage} ownerSaving={p.owner.ownerSaving} error={p.owner.error} onEmailChange={p.onOwnerEmailChange} onRequestAssign={p.onRequestAssignOwner} onRequestRemove={p.onRequestRemoveOwner} />
      ) : p.manageTab === 'domain' ? (
        <RestaurantDomainPanel restaurantName={p.restaurant.name} restaurantSlug={p.restaurant.slug} customDomain={p.restaurant.custom_domain} />
      ) : p.manageTab === 'staff' ? (
        <RestaurantStaffPanel canManage={p.canManage} staffLoading={p.staffState.staffLoading} staffError={p.staffState.staffError} restaurantStaff={p.staffState.restaurantStaff} staffActionError={p.staffState.staffActionError} staffActionId={p.staffState.staffActionId} onSetStaffActive={p.onSetStaffActive} onRequestDelete={p.onRequestDeleteStaff} />
      ) : (
        <RestaurantSettingsPanel canManage={p.canManage} settingsLoading={p.settingsState.settingsLoading} cashOnDeliveryEnabled={p.settingsState.cashOnDeliveryEnabled} onCashOnDeliveryChange={p.onCashOnDeliveryChange} cashOnPickupEnabled={p.settingsState.cashOnPickupEnabled} onCashOnPickupChange={p.onCashOnPickupChange} automaticRiderAssignmentEnabled={p.settingsState.automaticRiderAssignmentEnabled} onAutomaticRiderAssignmentChange={p.onAutomaticRiderAssignmentChange} onlinePaymentsEnabled={p.settingsState.onlinePaymentsEnabled} onOnlinePaymentsEnabledChange={p.onOnlinePaymentsEnabledChange} settingsError={p.settingsState.settingsError} settingsSaving={p.settingsState.settingsSaving} onRequestSave={p.onRequestSaveSettings} />
      )}
    </section>
  );
}
