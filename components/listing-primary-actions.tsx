'use client';

import { trackEvent } from '@/lib/analytics-client';
import { ActionIcon } from './action-icon';

export function ListingPrimaryActions({
  phone,
  whatsapp,
  mapsUrl,
  locality,
  category,
  listingSlug,
}: {
  phone: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  locality: string;
  category: string;
  listingSlug: string;
}) {
  const data = { locality, category, listingSlug };

  return (
    <div className="detail-actions">
      {phone && <a className="button button--light" href={`tel:${phone}`} onClick={() => trackEvent('Listing Call', data)}><ActionIcon name="call" /><span>اتصال الآن</span></a>}
      {whatsapp && <a className="button button--whatsapp" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing WhatsApp', data)}><ActionIcon name="call" /><span>واتساب</span></a>}
      {mapsUrl && <a className="button button--outline-light" href={mapsUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing Map Opened', data)}><ActionIcon name="map" /><span>فتح الخريطة</span></a>}
    </div>
  );
}
