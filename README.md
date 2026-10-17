# Web2Table System Admin

React + TypeScript + Vite system administration app using Supabase.

## Requirements

- Node.js 20.19+ or 22.12+ (compatible with Vite 7)
- npm
- Supabase project URL and public anon/publishable key

## Environment variables

Create `.env.local` for local development (or configure these variables in your build environment):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

Only the public Supabase anon/publishable key belongs in this browser application. **Never use a service-role key here.** Database security must be enforced by Supabase RLS and protected database functions.

## Build for Hostinger shared hosting

This is a static frontend; the React app does not require a Node.js server after the build.

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local `.env.local` file or build environment.
2. Run:

   ```bash
   npm ci
   npm run build:hostinger
   ```

3. Vite writes the production site to `dist/`. Upload the **contents** of `dist/` (including `index.html`, assets, and the included `.htaccess`) to the Hostinger domain/subdomain document root, commonly `public_html/` or the selected subdomain's document root.
4. Confirm Apache's `mod_rewrite` and `mod_headers` are enabled. The root `.htaccess` provides SPA fallback routing and asset caching.
5. Open the deployed URL and verify sign-in, MFA, restaurant/administrator pages, and database-backed actions.

The Hostinger build uses `/` as the asset base, intended for a domain or subdomain document root. If hosting under a URL subdirectory instead, update the Vite base path before building.

## Build a Hostinger package through GitHub Actions

The `Build Hostinger package` workflow creates a downloadable artifact from the root-based Hostinger build. Before running it, add these repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`: the production Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: the public anon/publishable key (never a service-role key)

Then open **Actions → Build Hostinger package → Run workflow**. When it succeeds, open that run, download the `web2table-system-admin-hostinger` artifact, extract it, and upload the extracted files to the document root for `admin.web2table.io`. This artifact is separate from the GitHub Pages deployment.

## GitHub Pages

The regular `npm run build` command retains the existing GitHub Pages base path. Use `npm run build:hostinger` only for a root-domain/subdomain deployment.

## Security and production checklist

- Configure the correct production Supabase URL and public anon/publishable key before building.
- Configure Supabase Auth's allowed site URL and redirect URLs for the final Hostinger domain.
- Ensure all required Supabase RLS policies and RPC permissions are enabled; frontend UI checks are not security boundaries.
- Use HTTPS for the deployed domain.
- Do not upload `.env.local`, source maps, credentials, or service-role secrets.
- After deployment, test authentication and important privileged workflows against production data before switching users over.
