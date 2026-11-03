import type { ComponentProps } from 'react';
import type { Restaurant } from './types';
import RestaurantManagementHeader from './components/RestaurantManagementHeader';
import RestaurantOverview from './components/RestaurantOverview';
import RestaurantOwnerPanel from './components/RestaurantOwnerPanel';
import RestaurantDomainPanel from './components/RestaurantDomainPanel';
import RestaurantSettingsPanel from './components/RestaurantSettingsPanel';
import RestaurantStaffPanel from './components/RestaurantStaffPanel';
import PosIntegrationPanel from './components/PosIntegrationPanel';

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
  domain: string;
  onDomainChange: (value: string) => void;
  domainSaving: boolean;
  domainError: string;
  onRequestSaveDomain: () => void;
  staffState: Pick<StaffProps, 'staffLoading' | 'staffError' | 'restaurantStaff' | 'staffActionError' | 'staffActionId'>;
  onSetStaffActive: StaffProps['onSetStaffActive'];
  onRequestDeleteStaff: StaffProps['onRequestDelete'];
  settingsState: Pick<SettingsProps, 'settingsLoading' | 'vatRegistered' | 'vatRate' | 'pricesVatInclusive' | 'cashOnDeliveryEnabled' | 'cashOnPickupEnabled' | 'automaticRiderAssignmentEnabled' | 'onlinePaymentsEnabled' | 'settingsError' | 'settingsSaving' | 'taxpayerProfileLoading' | 'taxpayerProfile' | 'taxpayerProfileError' | 'taxpayerProfileMessage' | 'taxpayerProfileSaving' | 'birReadinessLoading' | 'birReadiness' | 'birReadinessError' | 'invoiceSeriesSaving' | 'invoiceSeriesError' | 'invoiceSeriesMessage'>;
  onVatRegisteredChange: SettingsProps['onVatRegisteredChange'];
  onVatRateChange: SettingsProps['onVatRateChange'];
  onPricesVatInclusiveChange: SettingsProps['onPricesVatInclusiveChange'];
  onCashOnDeliveryChange: SettingsProps['onCashOnDeliveryChange'];
  onCashOnPickupChange: SettingsProps['onCashOnPickupChange'];
  onAutomaticRiderAssignmentChange: SettingsProps['onAutomaticRiderAssignmentChange'];
  onOnlinePaymentsEnabledChange: SettingsProps['onOnlinePaymentsEnabledChange'];
  onTaxpayerProfileChange: SettingsProps['onTaxpayerProfileChange'];
  onRequestReviewTaxpayerProfile: SettingsProps['onRequestReviewSave'];
  onConfigureDisabledInvoiceSeries: SettingsProps['onConfigureDisabledInvoiceSeries'];
  onRequestSaveSettings: () => void;
};

export default function RestaurantDetailsPage(p: Props) {
  return (
    <section className="dashboard-card restaurant-manage-card">
      <RestaurantManagementHeader restaurant={p.restaurant} manageTab={p.manageTab} onSelectTab={p.onSelectTab} onClose={p.onClose} onLoadOwner={p.onLoadOwner} onSelectDomain={p.onSelectDomain} onLoadSettings={p.onLoadSettings} onLoadStaff={p.onLoadStaff} onLoadPos={p.onLoadPos} />
      {p.manageTab === 'pos' ? (
        <PosIntegrationPanel restaurant={p.restaurant} status={p.posIntegration.status} loading={p.posIntegration.loading} saving={p.posIntegration.saving} error={p.posIntegration.error} message={p.posIntegration.message} canManage={p.canManage} onAction={p.onSetPosIntegration} />
      ) : p.manageTab === 'overview' ? (
        <RestaurantOverview restaurant={p.restaurant} canManage={p.canManage} onRequestStatusChange={p.onRequestStatusChange} />
      ) : p.manageTab === 'owner' ? (
        <RestaurantOwnerPanel loading={p.owner.loading} ownerUserId={p.owner.ownerUserId} ownerName={p.owner.ownerName} ownerEmail={p.owner.ownerEmail} canManage={p.canManage} ownerSaving={p.owner.ownerSaving} error={p.owner.error} onEmailChange={p.onOwnerEmailChange} onRequestAssign={p.onRequestAssignOwner} onRequestRemove={p.onRequestRemoveOwner} />
      ) : p.manageTab === 'domain' ? (
        <RestaurantDomainPanel domain={p.domain} onDomainChange={p.onDomainChange} canManage={p.canManage} domainSaving={p.domainSaving} domainError={p.domainError} onRequestSave={p.onRequestSaveDomain} />
      ) : p.manageTab === 'staff' ? (
        <RestaurantStaffPanel canManage={p.canManage} staffLoading={p.staffState.staffLoading} staffError={p.staffState.staffError} restaurantStaff={p.staffState.restaurantStaff} staffActionError={p.staffState.staffActionError} staffActionId={p.staffState.staffActionId} onSetStaffActive={p.onSetStaffActive} onRequestDelete={p.onRequestDeleteStaff} />
      ) : (
        <RestaurantSettingsPanel canManage={p.canManage} settingsLoading={p.settingsState.settingsLoading} vatRegistered={p.settingsState.vatRegistered} onVatRegisteredChange={p.onVatRegisteredChange} vatRate={p.settingsState.vatRate} onVatRateChange={p.onVatRateChange} pricesVatInclusive={p.settingsState.pricesVatInclusive} onPricesVatInclusiveChange={p.onPricesVatInclusiveChange} cashOnDeliveryEnabled={p.settingsState.cashOnDeliveryEnabled} onCashOnDeliveryChange={p.onCashOnDeliveryChange} cashOnPickupEnabled={p.settingsState.cashOnPickupEnabled} onCashOnPickupChange={p.onCashOnPickupChange} automaticRiderAssignmentEnabled={p.settingsState.automaticRiderAssignmentEnabled} onAutomaticRiderAssignmentChange={p.onAutomaticRiderAssignmentChange} onlinePaymentsEnabled={p.settingsState.onlinePaymentsEnabled} onOnlinePaymentsEnabledChange={p.onOnlinePaymentsEnabledChange} settingsError={p.settingsState.settingsError} settingsSaving={p.settingsState.settingsSaving} onRequestSave={p.onRequestSaveSettings} taxpayerProfileLoading={p.settingsState.taxpayerProfileLoading} taxpayerProfile={p.settingsState.taxpayerProfile} taxpayerProfileError={p.settingsState.taxpayerProfileError} taxpayerProfileMessage={p.settingsState.taxpayerProfileMessage} taxpayerProfileSaving={p.settingsState.taxpayerProfileSaving} birReadinessLoading={p.settingsState.birReadinessLoading} birReadiness={p.settingsState.birReadiness} birReadinessError={p.settingsState.birReadinessError} invoiceSeriesSaving={p.settingsState.invoiceSeriesSaving} invoiceSeriesError={p.settingsState.invoiceSeriesError} invoiceSeriesMessage={p.settingsState.invoiceSeriesMessage} onConfigureDisabledInvoiceSeries={p.onConfigureDisabledInvoiceSeries} onTaxpayerProfileChange={p.onTaxpayerProfileChange} onRequestReviewSave={p.onRequestReviewTaxpayerProfile} />
      )}
    </section>
  );
}
