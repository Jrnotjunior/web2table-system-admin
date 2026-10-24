# Hostinger Email setup for Web2Table Auth

Supabase Auth sends account invitations and verification emails. Hostinger Email provides only the SMTP sending mailbox; the approved System Admin recipient remains their own email address.

1. In Hostinger hPanel, create or identify an existing authorized sender mailbox and check Emails > Manage > Connect Apps & Devices.
2. For standard Hostinger Email use SMTP host smtp.hostinger.com, port 465 with SSL. If required, try 587 with STARTTLS. Other Hostinger mail products may use different servers; follow the mailbox's settings.
3. In the NEW Web2Table Supabase project, go to Authentication > SMTP Settings and enable custom SMTP. Sender name: Web2Table. Sender address and SMTP user: the real Hostinger mailbox. SMTP password: mailbox password entered directly in the Supabase Dashboard.
4. Set valid SPF, DKIM and DMARC for the sending domain. Confirm the Supabase Site URL and Redirect URLs contain https://admin.web2table.io/.
5. Deploy the new Web2Table Admin build to Hostinger and verify its sign-in page at the actual custom domain. GitHub Actions only packages the site; it does not deploy to Hostinger.
6. From Supabase Authentication > Users, send the invitation to the privately approved System Admin Gmail recipient. Once email verified, complete TOTP MFA. The backend authorizes the one-time administrator bootstrap only after both steps.

Never share mailbox passwords, SMTP credentials, Supabase secret keys or invitation tokens in chat, source code, frontend variables, artifacts or GitHub Actions.

Documentation: https://supabase.com/docs/guides/auth/auth-smtp
Hostinger settings: https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/