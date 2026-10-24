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

## Crucial activation blocker

At the time of integration, **Web2Table Auth had zero users and `platform_admins` had zero entries**. Existing sign-ins from the older Auth project cannot be trusted by the new project or automatically reused, because they are issued by different identity providers. Accounts are **not copied or silently elevated**.

A trusted administrator must arrange creation and verification of the designated account **inside the new Auth project** and explicitly approve its `auth.users.id` before adding it to `public.platform_admins`, followed by MFA enrollment in this interface. No bootstrap mutation should be made without this explicit identity approval.

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
