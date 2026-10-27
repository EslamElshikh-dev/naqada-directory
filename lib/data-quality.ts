import type { Business } from './types';
import { cleanPhone } from './site';
import { getBusinessMedia } from './business-media';
import { isActivityMapUrl } from './activity-map';
export function businessCompleteness(item: Business) {
  const fields = [
    { name: 'الهاتف', present: Boolean(cleanPhone(item.phone)) },
    { name: 'المواعيد', present: Boolean(item.hours?.trim()) },
    { name: 'العنوان', present: Boolean(item.address?.trim()) },
    { name: 'صورة النشاط', present: Boolean(item.ownerPhotoPaths?.length || getBusinessMedia(item.id)) },
    { name: 'الخريطة', present: Boolean(item.mapsUrl && isActivityMapUrl(item.mapsUrl)) },
  ];
  return { item, missing: fields.filter(field => !field.present).map(field => field.name), score: fields.filter(field => field.present).length * 20 };
}
