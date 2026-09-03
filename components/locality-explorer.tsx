'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { LocalityPage } from '@/lib/types';
import { normalizeArabic } from '@/lib/site';
import { BrandMark } from './site-shell';

export function LocalityExplorer({ localities }: { localities: LocalityPage[] }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const kinds = [...new Set(localities.map((item) => item.type))].sort((a, b) => a.localeCompare(b, 'ar'));
  const needle = normalizeArabic(query);
  const filtered = localities.filter((item) => (!kind || item.type === kind) && (!needle || normalizeArabic([item.name, item.type, item.classification, item.scope, item.notes].filter(Boolean).join(' ')).includes(needle)));

  return (
    <div className="locality-explorer">
      <div className="explorer__tools explorer__tools--two">
        <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">ابحث عن قرية أو نجع</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن قرية أو نجع أو عزبة…" /></label>
        <label className="select-field"><span>النوع</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">كل الأنواع</option>{kinds.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      </div>
      <div className="results-bar"><div><strong>{filtered.length.toLocaleString('ar-EG')}</strong><span> موضعًا مطابقًا</span></div></div>
      {filtered.length ? <div className="village-grid">{filtered.map((item, index) => (
        <Link href={`/villages/${item.slug}`} key={item.slug} className="village-card">
          <div className="village-card__head"><span className="village-card__visual"><BrandMark compact /></span><span className="village-card__index">{String(index + 1).padStart(2, '0')}</span></div>
          <span className="village-card__type">{item.type}</span>
          <h2>{item.name}</h2>
          <p>{item.notes || item.scope || `${item.name} ضمن النطاق الجغرافي لمركز نقادة.`}</p>
          <div className="village-card__meta"><span><b>{item.businessCount.toLocaleString('ar-EG')}</b> سجل خدمي</span><span>{item.verification || 'مراجع'}</span></div>
          <span className="village-card__cta">فتح صفحة الموضع ←</span>
        </Link>
      ))}</div> : <div className="empty-state"><strong>لا يوجد موضع مطابق</strong><p>جرّب كتابة جزء من الاسم.</p></div>}
    </div>
  );
}
