# Web2Table System Admin integration

## Why Web2Table has a compatibility mode

This repository is the **existing separate System Admin** application. Its legacy pages use the older Supabase project’s `public.restaurants` and `system_admin_*` RPC contract, which is incompatible with the newer Web2Table restaurant ordering platform’s `tenants`, `platform_admins`, `privileged_invitations`, and RLS.

The new Web2Table platform is at project `wvibrchebfwirbgkcnbr`. The old independent database is `xaihajwrsvcdjisezmmc`. **Do not migrate or rewrite the older database in place**. Do not connect the older project's finance, invoicing or unrelated restaurant schema into Web2Table.

The GitHub Pages workflow explicitly sets `VITE_WEB2TABLE_ADMIN=true` and builds the **Web2Table integration mode**, which uses the existing repo/deployment but the new platform's access-control and provisioning APIs. Other builds remain in the old mode until deliberately configured; this avoids silently replacing the current Hostinger application.

## Web2Table integration capabilities

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

1. In the **Web2Table** Supabase project (NOT the older project), configure Authentication > URL Configuration to allow `https://admin.web2table.io/` as the canonical invitation redirect, and verify the email sender is configured.
2. In Authentication > Users, choose **Add user > Send invitation**, using the designated email. This requires an authorized Dashboard operator or trusted server: browser clients cannot send an Auth Admin invitation. Do not expose a secret API key.
3. The invited recipient clicks the email link and arrives at the System Admin custom-domain app (after verifying that the Web2Table mode is deployed). Email confirmation is checked against `auth.users` by the backend.
4. The Web2Table app checks `is_initial_admin_bootstrap_candidate()`; a pending invite permits **only MFA enrollment**. Complete a verified TOTP authenticator challenge.
5. Once the session has `aal2`, the app calls `claim_initial_admin_bootstrap()`. The server checks the originally approved email, confirmed Auth address, one-time expiry, lack of any existing administrator, and MFA, then atomically activates one `platform_admins` record.
6. A logged-in, MFA-verified administrator can optionally set a 12+ character password for future sign-ins.

The private bootstrap invitation expires after **7 days** (current request: October 31, 2026). The System Admin app never creates Auth accounts, migrates previous accounts, or grants roles on its own. The backend rejects any uninvited, unverified, expired, duplicate, or non-MFA claim.

**Important:** The Supabase connector used by this workflow cannot invoke `auth.admin.inviteUserByEmail`; the invitation email has **not been sent**. After Dashboard invitation and verification, run a real browser authentication/MFA test before using live privileged operations.

## Deployment routes

System Admin custom domain (intended production entry point):
https://admin.web2table.io/

Web2Table GitHub Pages preview (retained for testing):
https://jrnotjunior.github.io/web2table-system-admin/

Web2Table customer storefront:
https://jrnotjunior.github.io/Multi-Tenant-Restaurant-Ordering-Platform-SaaS/

**Critical deployment check:** Both Hostinger packaging workflows now set the VITE_WEB2TABLE_ADMIN=true build flag. The custom domain is not automatically running the Web2Table integration just because its URL has changed. Before switching the custom-domain deployment, confirm its hosting source, Supabase project, Auth redirect allowlist, HTTPS, intended user access, and real admin/MFA testing. Avoid auto-migrating legacy accounts, databases, and privileges.

## Typography

The new Web2Table surface uses only **Inter** and **Manrope**. Its CSS does not import the legacy min-width desktop-only styles.

## Verification

Run `npm run build:github-pages` and inspect GitHub Actions after code changes. Functional login, MFA, onboarding, tenant creation and invitation acceptance cannot be exercised until the verified new-project administrator exists. Do not claim they have been completed.

## Hostinger Email SMTP

Use a real Hostinger mailbox as the Supabase Auth SMTP sender. This is independent of the administrator login email.
Navigate to Hostinger Emails > Manage > Connect Apps & Devices to confirm the mailbox-specific server.
For standard Hostinger Email: smtp.hostinger.com on port 465 SSL, or 587 STARTTLS if needed.
In the new Web2Table Supabase project: Authentication > SMTP Settings > Enable custom SMTP. Sender name: Web2Table. Sender email and SMTP username: existing full Hostinger mailbox address. Enter the mailbox password only in Supabase Dashboard.
Check SPF, DKIM and DMARC. Keep the Site URL and allowed redirect at https://admin.web2table.io/ and send the approved administrator Auth invitation only once the custom domain loads the current Web2Table admin build.
Neither GitHub Actions packaging nor saving SMTP settings sends an invitation. Never put mailbox credentials, secret API keys or tokens into GitHub or frontend build variables.

### Hosting deployment

Both Hostinger workflows build the current Web2Table admin interface, but they only produce ZIP artifacts. The Hostinger website is NOT changed until the artifact contents are uploaded to its document root.
## Invitation-link recovery

If an invitation is confirmed in Supabase Auth but a reused email link returns `error_code=otp_expired`, **do not delete the verified Auth user, bypass MFA or issue another admin role**. On the Web2Table custom-domain sign-in page, enter the invited address and choose **Set or reset your password**. A Supabase Auth `resetPasswordForEmail` request sends a fresh single-use recovery link to that existing address and redirects to `https://admin.web2table.io/`. On the `PASSWORD_RECOVERY` Auth event, the app displays a 12+ character password-change form via `updateUser`. Following the new password, the existing private candidate/MFA/AAL2 bootstrap authorization remains required.

Avoid double-clicking or forwarding the recovery link. Recovery links may be consumed by security scanners or browser extensions; if the new link is rejected, investigate the Supabase Auth logs and email delivery. Never disclose live invitation or recovery tokens.
