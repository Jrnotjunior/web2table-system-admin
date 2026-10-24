import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The existing System Admin remains intact in legacy mode.
// GitHub Pages explicitly activates Web2Table to use Web2Table's current protected
// tenant APIs; no legacy restaurants, tax or billing workflows are imported.
const root=createRoot(document.getElementById('root')!);
if(import.meta.env.VITE_WEB2TABLE_ADMIN==='true'){
  void import('./web2table-admin/Web2TableAdminApp').then(({default:App})=>{
    root.render(<StrictMode><App /></StrictMode>);
  });
}else{
  void import('./styles.css').then(()=>import('./App')).then(({default:App})=>{
    root.render(<StrictMode><App /></StrictMode>);
  });
}
