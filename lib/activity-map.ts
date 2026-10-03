export function isActivityMapUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    return url.hostname === 'maps.app.goo.gl'
      || (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps'))
      || (['google.com', 'www.google.com', 'maps.google.com'].includes(url.hostname)
        && (url.pathname.startsWith('/maps') || (url.hostname === 'maps.google.com' && url.pathname === '/')));
  } catch { return false; }
}

export function activityMapLink(listing: { name: string; address: string; locality: string; maps_url?: string | null }) {
  if (listing.maps_url && isActivityMapUrl(listing.maps_url)) {
    return { url: listing.maps_url, label: 'الاتجاهات', hasPin: true };
  }
  const query = `${listing.name}، ${listing.address}، ${listing.locality}، نقادة، قنا`;
  return { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, label: 'بحث بالعنوان', hasPin: false };
}
