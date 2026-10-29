import { unstable_cache } from 'next/cache';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { PUBLIC_CONTENT_TAG, PUBLIC_READ_TIMEOUT_MS } from '@/lib/public-content-cache';
type Pin = { latitude: number; longitude: number };
export const getBusinessLocations = unstable_cache(async (): Promise<Record<string,Pin>> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/directory_business_locations?select=place_id,latitude,longitude&limit=1000`, {
      headers: restHeaders(), cache: 'no-store', signal: AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS),
    });
    if (!response.ok) throw Error('VERIFIED_PINS_UNAVAILABLE');
    const rows = await response.json() as { place_id: string; latitude: number | string; longitude: number | string }[];
    return Object.fromEntries(rows.flatMap(row => {
      const latitude=Number(row.latitude),longitude=Number(row.longitude);
      return row.place_id && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude)<=90 && Math.abs(longitude)<=180
        ? [[row.place_id,{latitude,longitude}]] : [];
    }));
  } catch { return {}; }
}, ['verified-business-pins-v1'], { revalidate: 3600, tags: [PUBLIC_CONTENT_TAG] });
