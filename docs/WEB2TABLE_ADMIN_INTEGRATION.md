# Web2Table System Admin integration — approved UI boundary

The existing original **System Admin UI is final**. The original `src/App.tsx` and its styles and components are the only approved interface. A replacement Web2Table administration UI introduced during platform integration has been **withdrawn**. Do not recreate, switch to, or deploy a duplicate admin design.

The current entry point directly renders the original App, without a build-environment mode switch. Hostinger’s GitHub auto-deployment builds that App; the repository’s Hostinger packaging workflows and Pages build verify the original UI is selected. **No database policies, accounts, or bootstrap invitations were changed by the UI restoration.**

**Important compatibility limitation:** The original App still relies on several services calling the previous `restaurants` / `system_admin_*` API contract. The newer Web2Table Supabase project uses different tenant and privilege APIs. The original UI may not yet be able to authenticate or perform restaurant-management actions against the new project. Integration must adapt those services behind the final UI, without weakening MFA or platform admin authorization. A verified email account and a pending bootstrap invitation do not themselves confer administrator privileges.

The domain remains https://admin.web2table.io/. The Hostinger SMTP sender is configured in Supabase Dashboard and is independent of UI source.


## Web2Table dashboard data adapter

The finalized System Admin UI remains unchanged. The dashboard now calls the read-only `public.web2table_admin_dashboard_snapshot()` function rather than legacy `system_admin_get_dashboard_summary` and `system_admin_get_restaurant_monitoring` APIs. The query is guarded by MFA AAL2 and an active `platform_admins` record in a private, least-privilege function. It returns real tenant counts, branch-independent tenant monitoring rows, and actual platform-admin counts. **No real order/customer analytics, audit log provider, or dependency health backend has been connected**, so order/customer figures are zero and the UI explicitly flags missing live health telemetry as a warning.

The existing Restaurant list reads `public.tenants` through its active-admin RLS, adapting the safe fields to the existing component type. Legacy detail mutators still require a separate service migration and must not be assumed compatible with the new schema. None of this changes the approved layout, styles, navigation or login UI. In the Supabase Table Editor, System Admin identities are in `public.platform_admins`, not a table named `system_admin`.
