'use client';

import { trackEvent } from '@/lib/analytics-client';

export function ListingPrimaryActions({
  phone,
  whatsapp,
  mapsUrl,
  locality,
  category,
}: {
  phone: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  locality: string;
  category: string;
}) {
  const data = { locality, category };

  return (
    <div className="detail-actions">
      {phone && <a className="button button--light" href={`tel:${phone}`} onClick={() => trackEvent('Listing Call', data)}>اتصال الآن</a>}
      {whatsapp && <a className="button button--whatsapp" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing WhatsApp', data)}>واتساب</a>}
      {mapsUrl && <a className="button button--outline-light" href={mapsUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing Map Opened', data)}>فتح الخريطة ↗</a>}
    </div>
  );
}
