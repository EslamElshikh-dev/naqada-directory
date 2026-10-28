import { isActivityMapUrl } from './activity-map';

/** Only explicit all-day hours are machine readable; free text stays on the page. */
export function fullTimeHours(value?: string | null) {
  if (!value || !/^(?:(?:24|٢٤)\s*(?:ساعة|ساعه)|طوال اليوم|على مدار الساعة)[.۔\s]*$/.test(value.trim())) return undefined;
  return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' }];
}

/** Use a published place pin, never the map viewport or an address guess. */
export function verifiedMapCoordinates(value?: string | null) {
  if (!value || !isActivityMapUrl(value)) return undefined;
  const url = new URL(value);
  const query = url.searchParams.get('query') || url.searchParams.get('q') || '';
  const pair = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(query)
    || /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url.href);
  if (!pair) return undefined;
  const latitude = Number(pair[1]), longitude = Number(pair[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  return { '@type': 'GeoCoordinates', latitude, longitude };
}
