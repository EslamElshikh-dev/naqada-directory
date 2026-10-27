import '@/app/content-styles.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { resolveSession } from '@/lib/auth/session';
import { getEffectiveBusiness } from '@/lib/curated-content';
import { categories, localities } from '@/lib/data';
import { ContributionBuilder } from '@/components/contribution-builder';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: 'طلب إدارة بيانات نشاط | دليل نقادة' }, robots: { index: false, follow: false } };
export default async function Claim({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getEffectiveBusiness(slug);
  if (!listing) notFound();
  const session = await resolveSession(false);
  const path = '/claim/' + encodeURIComponent(listing.slug) + '/';
  return <main id="main-content" className="shell page-main"><h1>ده نشاطك؟</h1>
    <h2>{listing.name}</h2><p>ابعث طلبًا لمراجعة صفتك وعلاقتك بالنشاط. لا ينقل هذا الطلب ملكية السجل ولا يمنح صلاحية التعديل تلقائيًا. اذكر مصدرًا عامًا للتحقق وتجنب المستندات الحساسة.</p>
    {!session ? <Link className="button button--primary" href={'/api/auth/google?next=' + encodeURIComponent(path)}>سجّل عبر Google وأكمل الطلب</Link>
      : <Suspense fallback={<p>جارٍ فتح الطلب…</p>}><ContributionBuilder categories={categories} localities={localities}
        defaults={{ type: 'correction', name: listing.name, category: listing.category, locality: listing.locality || '', listing: listing.slug, details: 'طلب مراجعة صفتي لإدارة بيانات النشاط. صفتي وعلاقتي بالنشاط: ' }} /></Suspense>}
  </main>;
}
