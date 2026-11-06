import { useEffect, useState } from 'react';
import { setRestaurantCustomDomain } from '../services/restaurantDomainService';

type RestaurantDomainPanelProps = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  customDomain: string | null;
};

export default function RestaurantDomainPanel({ restaurantId, restaurantName, restaurantSlug, customDomain }: RestaurantDomainPanelProps) {
  const [domain, setDomain] = useState(customDomain ?? '');
  const [savedDomain, setSavedDomain] = useState(customDomain ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDomain(customDomain ?? '');
    setSavedDomain(customDomain ?? '');
  }, [restaurantId, customDomain]);

  const hostname = savedDomain.trim().toLowerCase();
  const isCustomDomain = Boolean(hostname) && hostname !== 'app.web2table.io';
  const activeDomain = isCustomDomain ? hostname : 'app.web2table.io';
  const orderingUrl = `https://${activeDomain}/#order/${encodeURIComponent(restaurantSlug)}?branch=main`;

  async function saveDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const normalized = domain.trim().toLowerCase();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data, error: saveError } = await setRestaurantCustomDomain(restaurantId, normalized);
      if (saveError) throw saveError;
      setSavedDomain(typeof data === 'string' ? data : normalized);
      setDomain(typeof data === 'string' ? data : normalized);
      setMessage(normalized
        ? 'Custom domain saved. It will be used after domain verification and activation.'
        : 'Custom domain removed. The restaurant will use its Web2Table ordering domain.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the restaurant domain.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="manage-overview">
      <div className="overview-section">
        <div className="eyebrow">Restaurant ordering domain</div>
        <h3>Public ordering URL</h3>
        <p>{isCustomDomain ? 'This restaurant has its own custom ordering domain configured.' : "This restaurant uses Web2Table's shared ordering domain. You can configure its own domain below."}</p>
        <div className="domain-status-panel">
          <div>
            <strong>{isCustomDomain ? 'Configured custom domain' : 'Web2Table platform domain'}</strong>
            <span><strong>{activeDomain}</strong> is the configured ordering domain for {restaurantName}.</span>
          </div>
          <span className="status active">{isCustomDomain ? 'Custom' : 'Platform'}</span>
        </div>
        <form className="domain-form" onSubmit={saveDomain}>
          <label>
            Custom restaurant domain
            <input value={domain} onChange={event => setDomain(event.target.value)} placeholder="orders.restaurant.com" autoComplete="off" spellCheck={false} maxLength={253} aria-label="Custom restaurant domain" />
          </label>
          <div className="domain-form-actions">
            <button type="submit" disabled={saving || domain.trim().toLowerCase() === savedDomain.trim().toLowerCase()}>{saving ? 'Saving...' : 'Save custom domain'}</button>
            <button type="button" className="secondary-button" onClick={() => { void navigator.clipboard?.writeText(orderingUrl); }}>Copy ordering URL</button>
          </div>
        </form>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {message && <div className="success-banner" role="status">{message}</div>}
        <div className="domain-help">
          Enter only the hostname, such as restaurant.com. Do not include https:// or a path. The restaurant's unique URL path (<strong>{restaurantSlug}</strong>) and default branch are retained. A newly saved domain remains pending until DNS ownership verification is completed.
        </div>
      </div>
    </div>
  );
}
