export type Business = {
  id: string;
  slug: string;
  name: string;
  normalizedName: string;
  category: string;
  subcategory: string | null;
  locality: string | null;
  parentLocality: string | null;
  address: string | null;
  phone: string | null;
  rating: number | null;
  reviews: number | null;
  hours: string | null;
  mapsUrl: string | null;
  placeId: string | null;
  verification: string | null;
  status: string;
  checked: string | null;
  notes: string | null;
  description?: string | null;
  seoKeywords?: string[] | null;
};

export type DirectoryItem = Pick<Business,
  'id' | 'slug' | 'name' | 'normalizedName' | 'category' | 'subcategory' |
  'locality' | 'parentLocality' | 'address' | 'phone' | 'rating' | 'reviews' | 'mapsUrl' | 'verification'
>;

export type LocalityRecord = {
  name: string;
  type: string;
  center: string | null;
  scope: string | null;
  verification: string | null;
  classification: string | null;
  source: string | null;
  notes: string | null;
};

export type Family = {
  id: string;
  name: string;
  alias: string | null;
  type: string;
  locality: string;
  parentLocality: string | null;
  grade: string;
  status: string;
  evidence: string | null;
  landmark: string | null;
  historical: string | null;
  source1: string | null;
  source2: string | null;
  scope: string | null;
  caution: string | null;
  checked: string | null;
};

export type PersonRecord = {
  id: string;
  name: string;
  connection: string | null;
  locality: string;
  role: string | null;
  family: string | null;
  grade: string;
  status: string;
  summary: string | null;
  source1: string | null;
  source2: string | null;
  caution: string | null;
  checked: string | null;
};

export type Landmark = {
  id: string;
  name: string;
  type: string;
  locality: string;
  grade: string;
  status: string;
  summary: string | null;
  person: string | null;
  source1: string | null;
  source2: string | null;
  caution: string | null;
  checked: string | null;
};

export type Category = {
  name: string;
  slug: string;
  count: number;
  shortLabel: string;
  description: string;
};

export type LocalityPage = LocalityRecord & {
  slug: string;
  businessCount: number;
};
