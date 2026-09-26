import type { OwnerListing } from '@/lib/owner-listings';
import { normalizeSearchFields, prepareSearchQuery, scoreNormalizedSearchFields } from '@/lib/search-ranking';
import type { SiteSearchResult } from '@/lib/site-search';

export function searchOwnerListings(value: string, listings: OwnerListing[], limit = 8): SiteSearchResult[] {
  const query = value.trim();
  if (query.length < 2) return [];
  const { normalizedQuery, tokens } = prepareSearchQuery(query);
  return listings
    .map((listing) => ({
      listing,
      score: scoreNormalizedSearchFields(
        normalizeSearchFields({
          title: listing.name, category: listing.category, locality: listing.locality,
          address: listing.address, auxiliary: listing.description,
        }),
        normalizedQuery, tokens,
      ),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.listing.name.localeCompare(b.listing.name, 'ar'))
    .slice(0, limit)
    .map(({ listing }) => ({
      kind: 'listing',
      title: listing.name,
      subtitle: [listing.category, listing.locality, listing.address].join(' · '),
      href: `/activity/${listing.id}/`,
      badge: 'نشاط من صاحبه',
    }));
}
