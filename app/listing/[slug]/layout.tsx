import type { ReactNode } from 'react';
import { CrossDiscovery } from '@/components/cross-discovery';
import { getBusinessBySlug } from '@/lib/data';

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ListingLayout({ children, params }: Props) {
  const { slug } = await params;
  const listing = getBusinessBySlug(slug);

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
