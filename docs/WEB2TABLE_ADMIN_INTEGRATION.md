# Web2Table System Admin integration — approved UI boundary

The existing original **System Admin UI is final**. The original `src/App.tsx` and its styles and components are the only approved interface. A replacement Web2Table administration UI introduced during platform integration has been **withdrawn**. Do not recreate, switch to, or deploy a duplicate admin design.

The current entry point directly renders the original App, without a build-environment mode switch. Hostinger’s GitHub auto-deployment builds that App; the repository’s Hostinger packaging workflows and Pages build verify the original UI is selected. **No database policies, accounts, or bootstrap invitations were changed by the UI restoration.**

**Important compatibility limitation:** The original App still relies on several services calling the previous `restaurants` / `system_admin_*` API contract. The newer Web2Table Supabase project uses different tenant and privilege APIs. The original UI may not yet be able to authenticate or perform restaurant-management actions against the new project. Integration must adapt those services behind the final UI, without weakening MFA or platform admin authorization. A verified email account and a pending bootstrap invitation do not themselves confer administrator privileges.

The domain remains https://admin.web2table.io/. The Hostinger SMTP sender is configured in Supabase Dashboard and is independent of UI source.

