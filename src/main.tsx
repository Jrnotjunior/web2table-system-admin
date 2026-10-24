import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The existing System Admin remains intact in legacy mode.
// GitHub Pages explicitly activates V10 to use Web2Table's current protected
// tenant APIs; no legacy restaurants, tax or billing workflows are imported.
const root=createRoot(document.getElementById('root')!);
if(import.meta.env.VITE_WEB2TABLE_V10_ADMIN==='true'){
  void import('./platform-v10/V10AdminApp').then(({default:App})=>{
    root.render(<StrictMode><App /></StrictMode>);
  });
}else{
  void import('./styles.css').then(()=>import('./App')).then(({default:App})=>{
    root.render(<StrictMode><App /></StrictMode>);
  });
}
