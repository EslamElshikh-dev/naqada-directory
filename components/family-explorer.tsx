'use client';

import { useState } from 'react';
import type { Family } from '@/lib/types';
import { isSafeExternalUrl, normalizeArabic } from '@/lib/site';

const typeLabels: Record<string, string> = {
  current_family: 'عائلة حالية',
  current_family_partial: 'عائلة حالية — تفاصيل جزئية',
  historical_branch: 'فرع تاريخي',
  historical_family: 'سجل عائلي تاريخي',
  historical_origin_outmigration: 'أصل تاريخي وانتقال',
  family_presence_signal: 'حضور عائلي',
  family_core: 'عائلة',
};

export function FamilyExplorer({ families }: { families: Family[] }) {
  const [query, setQuery] = useState('');
  const [locality, setLocality] = useState('');
  const [grade, setGrade] = useState('');
  const localities = [...new Set(families.map((item) => item.locality))].sort((a, b) => a.localeCompare(b, 'ar'));
  const grades = [...new Set(families.map((item) => item.grade))].sort();
  const tokens = normalizeArabic(query).split(' ').filter(Boolean);
  const filtered = families.filter((item) => {
    if (locality && item.locality !== locality) return false;
    if (grade && item.grade !== grade) return false;
    if (!tokens.length) return true;
    const haystack = normalizeArabic([item.name, item.alias, item.locality, item.parentLocality, item.landmark, item.historical, item.evidence].filter(Boolean).join(' '));
    return tokens.every((token) => haystack.includes(token));
  });

  return (
    <div>
      <div className="explorer__tools explorer__tools--three">
        <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">اسم العائلة أو الديوان</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم العائلة أو الديوان…" /></label>
        <label className="select-field"><span>الموضع</span><select value={locality} onChange={(event) => setLocality(event.target.value)}><option value="">كل المواضع</option>{localities.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="select-field"><span>الدرجة</span><select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">كل الدرجات</option>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="results-bar"><div><strong>{filtered.length.toLocaleString('ar-EG')}</strong><span> سجلًا منشورًا</span></div></div>
      <div className="record-grid">{filtered.map((item) => (
        <article className="record-card" key={item.id}>
          <div className="record-card__top"><span>{typeLabels[item.type] || item.type.replaceAll('_', ' ')}</span><b>درجة {item.grade}</b></div>
          <h2>{item.name}{item.alias ? <small> · {item.alias}</small> : null}</h2>
          <p className="record-card__place">{item.locality}{item.parentLocality ? ` — ${item.parentLocality}` : ''}</p>
          <dl>
            {item.evidence && <div><dt>دليل الإدراج</dt><dd>{item.evidence}</dd></div>}
            {item.landmark && <div><dt>معلم مرتبط</dt><dd>{item.landmark}</dd></div>}
            {item.historical && <div><dt>سياق تاريخي</dt><dd>{item.historical}</dd></div>}
          </dl>
          {item.scope && <p className="record-card__scope">{item.scope}</p>}
          {item.caution && <p className="caution"><b>تنبيه:</b> {item.caution}</p>}
          <div className="source-links">
            {isSafeExternalUrl(item.source1) && <a href={item.source1 || '#'} target="_blank" rel="noreferrer">المصدر الأول ↗</a>}
            {isSafeExternalUrl(item.source2) && <a href={item.source2 || '#'} target="_blank" rel="noreferrer">المصدر الثاني ↗</a>}
          </div>
        </article>
      ))}</div>
    </div>
  );
}
