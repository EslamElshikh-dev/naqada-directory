import type { ReactNode } from 'react';
import { CrossDiscovery } from '@/components/cross-discovery';
import { getEffectiveBusiness } from '@/lib/curated-content';

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ListingLayout({ children, params }: Props) {
  const { slug } = await params;
  const listing = await getEffectiveBusiness(slug);

  return (
    <>
      {children}
      {listing ? (
        <div className="shell">
          <CrossDiscovery listing={listing} />
        </div>
      ) : null}
    </>
  );
}
