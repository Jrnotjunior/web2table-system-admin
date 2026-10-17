import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Keep GitHub Pages working while allowing a root-domain Hostinger build.
  base: mode === 'github-pages' ? '/web2table-system-admin/' : '/',
}));
