import { cache } from 'react';
import { businesses, canonicalLocalityName, parentLocalityName } from '@/lib/data';
import { getPublicCurated, type CuratedRecord } from '@/lib/auth/moderator';
import { getPublishedOwnerListings, ownerListingDirectoryItem } from '@/lib/owner-listings';
import { normalizeArabic } from '@/lib/site';
import type { Business, DirectoryItem } from '@/lib/types';

function text(payload: Record<string, string>, key: string, fallback: string | null = null) {
  return payload[key]?.trim() || fallback;
}

export function mergeBusinessCatalog(source: Business[], records: CuratedRecord[]) {
  const changes = new Map(records.filter((row) => row.origin === 'static').map((row) => [row.slug, row]));
  const merged = source.flatMap((business) => {
    const record = changes.get(business.slug);
    if (record?.status === 'hidden') return [];
    if (!record || record.status !== 'published') return [business];
    const payload = record.payload;
    const name = text(payload, 'title', business.name) || business.name;
    return [{
      ...business, name, normalizedName: normalizeArabic(name),
      description: text(payload, 'summary', business.description || null),
      category: text(payload, 'category', business.category) || business.category,
      locality: text(payload, 'locality', business.locality),
      phone: text(payload, 'phone', business.phone),
      address: text(payload, 'address', business.address),
      hours: text(payload, 'hours', business.hours),
      checked: record.updatedAt.slice(0, 10),
    }];
  });
  for (const row of records) {
    if (row.origin !== 'original' || row.status !== 'published') continue;
    const payload = row.payload;
    const name = text(payload, 'title') || '';
    if (!name) continue;
    merged.push({
      id: `editor:${row.slug}`, slug: row.slug, name, normalizedName: normalizeArabic(name),
      category: text(payload, 'category') || 'خدمات محلية', subcategory: null,
      locality: text(payload, 'locality'), parentLocality: null,
      address: text(payload, 'address'), phone: text(payload, 'phone'),
      rating: null, reviews: null, hours: text(payload, 'hours'), mapsUrl: null,
      placeId: null, verification: 'من فريق دليل نقادة', status: 'published',
      checked: row.updatedAt.slice(0, 10), notes: null, description: text(payload, 'summary'),
    });
  }
  return merged;
}

function ownerBusinesses(rows: Awaited<ReturnType<typeof getPublishedOwnerListings>>): Business[] {
  return rows.map((row) => ({
    id: `owner:${row.id}`, slug: `owner-${row.id}`, name: row.name,
    normalizedName: normalizeArabic(row.name), category: row.category, subcategory: null,
    locality: row.locality, parentLocality: null, address: row.address, phone: row.phone,
    rating: null, reviews: null, hours: row.hours, mapsUrl: null, placeId: null,
    verification: 'بيانات أضافها صاحب النشاط وراجعها فريق الدليل',
    status: 'published', checked: row.updated_at.slice(0, 10), notes: null,
    description: row.description, ownerPhotoPaths: row.photo_paths,
  }));
}

export function directoryItems(source: Business[]): DirectoryItem[] {
  return source.map((item) => ({
    id: item.id, slug: item.slug, name: item.name, normalizedName: item.normalizedName,
    category: item.category, subcategory: item.subcategory,
    locality: canonicalLocalityName(item.locality),
    parentLocality: parentLocalityName(item.locality, item.parentLocality),
    address: item.address, phone: item.phone, rating: item.rating,
    reviews: item.reviews, mapsUrl: item.mapsUrl, verification: item.verification,
  }));
}

export const getPublicBusinessCatalog = cache(async () => {
  const [rows, ownerListings] = await Promise.all([getPublicCurated('business'), getPublishedOwnerListings()]);
  const curated = mergeBusinessCatalog(businesses, rows);
  return {
    businesses: [...curated, ...ownerBusinesses(ownerListings)],
    directoryBusinesses: [...directoryItems(curated), ...ownerListings.map(ownerListingDirectoryItem)],
  };
});

export const getEffectiveBusiness = cache(async (slug: string) => {
  const catalog = await getPublicBusinessCatalog();
  return catalog.businesses.find((item) => item.slug === slug) || null;
});
