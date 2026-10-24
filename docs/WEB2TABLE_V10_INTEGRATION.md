# Web2Table V10 System Admin integration

## Why V10 has a compatibility mode

This repository is the **existing separate System Admin** application. Its legacy pages use the older Supabase project’s `public.restaurants` and `system_admin_*` RPC contract, which is incompatible with the newer Web2Table restaurant ordering platform’s `tenants`, `platform_admins`, `privileged_invitations`, and RLS.

The new Web2Table platform is at project `wvibrchebfwirbgkcnbr`. The old independent database is `xaihajwrsvcdjisezmmc`. **Do not migrate or rewrite the older database in place**. Do not connect the older project's finance, invoicing or unrelated restaurant schema into Web2Table.

The GitHub Pages workflow explicitly sets `VITE_WEB2TABLE_V10_ADMIN=true` and builds the **V10 integration mode**, which uses the existing repo/deployment but the new platform's access-control and provisioning APIs. Other builds remain in the old mode until deliberately configured; this avoids silently replacing the current Hostinger application.

## V10 integration capabilities

- Password sign-in against the **new** Web2Table Supabase Auth project (no self-registration).
- Database eligibility via `privileged_route_eligible('admin')`; a valid active `platform_admins` entry is required.
- Mandatory Supabase Auth AAL2 TOTP setup or challenge before showing any administration data.
- Restricted tenant listing using `tenants` RLS policies.
- Provision initial restaurant+branch draft via `admin_create_restaurant` RPC.
- Queue a Restaurant Owner invitation via `request_privileged_invitation` RPC; **no email is sent**. Trusted email delivery remains a separate task.
- Link to the separate mobile-first Web2Table storefront.

All operations remain server-authorized: a UI check does not grant privilege. No `service_role` key or backend secret is needed in the browser.

## First-administrator activation (W2T-008A)

The project owner explicitly designated one email address in conversation. That email was registered in **private** Web2Table Supabase bootstrap invitations; no address or authentication secret is stored in this public repository.

1. In the **Web2Table** Supabase project (NOT the older project), configure Authentication > URL Configuration to allow `https://jrnotjunior.github.io/web2table-system-admin/` as an invitation redirect, and verify the email sender is configured.
2. In Authentication > Users, choose **Add user > Send invitation**, using the designated email. This requires an authorized Dashboard operator or trusted server: browser clients cannot send an Auth Admin invitation. Do not expose a secret API key.
3. The invited recipient clicks the email link and arrives at the System Admin Pages app. Email confirmation is checked against `auth.users` by the backend.
4. The V10 app checks `is_initial_admin_bootstrap_candidate()`; a pending invite permits **only MFA enrollment**. Complete a verified TOTP authenticator challenge.
5. Once the session has `aal2`, the app calls `claim_initial_admin_bootstrap()`. The server checks the originally approved email, confirmed Auth address, one-time expiry, lack of any existing administrator, and MFA, then atomically activates one `platform_admins` record.
6. A logged-in, MFA-verified administrator can optionally set a 12+ character password for future sign-ins.

The private bootstrap invitation expires after **7 days** (current request: October 31, 2026). The System Admin app never creates Auth accounts, migrates previous accounts, or grants roles on its own. The backend rejects any uninvited, unverified, expired, duplicate, or non-MFA claim.

**Important:** The Supabase connector used by this workflow cannot invoke `auth.admin.inviteUserByEmail`; the invitation email has **not been sent**. After Dashboard invitation and verification, run a real browser authentication/MFA test before using live privileged operations.

## Deployment routes

V10 GitHub Pages preview:
https://jrnotjunior.github.io/web2table-system-admin/

Web2Table customer storefront:
https://jrnotjunior.github.io/Multi-Tenant-Restaurant-Ordering-Platform-SaaS/

Other deployment artifacts (including Hostinger) preserve the existing legacy UI unless `VITE_WEB2TABLE_V10_ADMIN=true` is supplied. Before switching a production domain, confirm its Supabase config, Auth redirect allowlist, HTTPS, intended user access, and finish end-to-end admin and invitation testing.

## Typography

The new V10 surface uses only **Inter** and **Manrope**. Its CSS does not import the legacy min-width desktop-only styles.

## Verification

Run `npm run build:github-pages` and inspect GitHub Actions after code changes. Functional login, MFA, onboarding, tenant creation and invitation acceptance cannot be exercised until the verified new-project administrator exists. Do not claim they have been completed.
