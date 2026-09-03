'use client';

import { useMemo, useState } from 'react';
import type { Landmark, PersonRecord } from '@/lib/types';
import { isSafeExternalUrl, normalizeArabic } from '@/lib/site';

type Tab = 'landmarks' | 'people';

export function HeritageExplorer({ landmarks, people }: { landmarks: Landmark[]; people: PersonRecord[] }) {
  const [tab, setTab] = useState<Tab>('landmarks');
  const [query, setQuery] = useState('');
  const records = tab === 'landmarks' ? landmarks : people;
  const filtered = useMemo(() => {
    const needle = normalizeArabic(query);
    return records.filter((item) => !needle || normalizeArabic(Object.values(item).filter((value) => typeof value === 'string').join(' ')).includes(needle));
  }, [query, records]);

  return (
    <div>
      <div className="heritage-toolbar">
        <div className="tabs" role="tablist" aria-label="نوع السجل">
          <button type="button" role="tab" aria-selected={tab === 'landmarks'} onClick={() => setTab('landmarks')}>المعالم <b>{landmarks.length.toLocaleString('ar-EG')}</b></button>
          <button type="button" role="tab" aria-selected={tab === 'people'} onClick={() => setTab('people')}>الشخصيات <b>{people.length.toLocaleString('ar-EG')}</b></button>
        </div>
        <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">ابحث في السجل التراثي</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الموضع…" /></label>
      </div>
      <div className="results-bar"><div><strong>{filtered.length.toLocaleString('ar-EG')}</strong><span> سجلًا</span></div></div>
      <div className="record-grid">{filtered.map((record) => {
        const isLandmark = 'type' in record;
        const name = record.name;
        const subtitle = isLandmark ? record.type : record.role;
        const summary = record.summary;
        return (
          <article className="record-card heritage-card" key={record.id}>
            <div className="record-card__top"><span>{isLandmark ? 'معلم محلي' : 'شخصية عامة'}</span><b>درجة {record.grade}</b></div>
            <h2>{name}</h2>
            <p className="record-card__place">{record.locality}{subtitle ? ` · ${subtitle}` : ''}</p>
            {summary && <p className="heritage-card__summary">{summary}</p>}
            {!isLandmark && record.family && <p className="record-card__scope"><b>صلة عائلية بحسب السجل:</b> {record.family}</p>}
            {isLandmark && record.person && <p className="record-card__scope"><b>شخصية مرتبطة:</b> {record.person}</p>}
            {record.caution && <p className="caution"><b>تنبيه:</b> {record.caution}</p>}
            <div className="source-links">
              {isSafeExternalUrl(record.source1) && <a href={record.source1 || '#'} target="_blank" rel="noreferrer">المصدر الأول ↗</a>}
              {isSafeExternalUrl(record.source2) && <a href={record.source2 || '#'} target="_blank" rel="noreferrer">المصدر الثاني ↗</a>}
            </div>
          </article>
        );
      })}</div>
    </div>
  );
}
