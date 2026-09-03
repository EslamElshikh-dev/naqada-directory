'use client';

import { useMemo, useState } from 'react';
import type { Category, LocalityPage } from '@/lib/types';
import { trackEvent } from '@/lib/analytics-client';

type ContributionType = 'add' | 'correction' | 'missing';

const fieldStyle = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: '12px',
  background: '#fff',
  color: 'var(--ink)',
  padding: '12px 13px',
  font: 'inherit',
} as const;

export function ContributionBuilder({
  categories,
  localities,
  initialType = 'add',
  initialName = '',
  initialQuery = '',
  initialCategory = '',
  initialLocality = '',
}: {
  categories: Category[];
  localities: LocalityPage[];
  initialType?: ContributionType;
  initialName?: string;
  initialQuery?: string;
  initialCategory?: string;
  initialLocality?: string;
}) {
  const [type, setType] = useState<ContributionType>(initialType);
  const [name, setName] = useState(initialName || initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [locality, setLocality] = useState(initialLocality);
  const [details, setDetails] = useState('');
  const [source, setSource] = useState('');
  const [contact, setContact] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeLabel = type === 'add' ? 'إضافة نشاط أو خدمة' : type === 'correction' ? 'تصحيح بيانات سجل' : 'نتيجة بحث مفقودة';
  const requestText = useMemo(() => [
    'مساهمة في دليل نقادة',
    `نوع الطلب: ${typeLabel}`,
    `الاسم أو الخدمة: ${name || 'غير محدد'}`,
    `التصنيف: ${category || 'غير محدد'}`,
    `الموضع: ${locality || 'غير محدد'}`,
    `التفاصيل: ${details || 'لا توجد تفاصيل إضافية'}`,
    `مصدر عام داعم: ${source || 'غير مرفق'}`,
    `وسيلة تواصل اختيارية: ${contact || 'غير مضافة'}`,
  ].join('\n'), [category, contact, details, locality, name, source, typeLabel]);

  function prepareRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrepared(true);
    trackEvent('Contribution Prepared', {
      type,
      hasSource: Boolean(source),
      hasContact: Boolean(contact),
      category: category || 'unspecified',
      locality: locality || 'unspecified',
    });
  }

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestText);
      setCopied(true);
      trackEvent('Contribution Copied', { type });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function shareRequest() {
    if (!navigator.share) {
      await copyRequest();
      return;
    }
    await navigator.share({ title: 'مساهمة في دليل نقادة', text: requestText });
    trackEvent('Contribution Shared', { type });
  }

  return (
    <div className="detail-layout">
      <form className="detail-card" onSubmit={prepareRequest}>
        <div className="detail-card__heading"><span className="eyebrow eyebrow--dark">بيانات المساهمة</span><h2>جهّز الطلب بشكل واضح وقابل للمراجعة</h2></div>
        <div className="detail-grid">
          <label><span>نوع الطلب</span><select style={fieldStyle} value={type} onChange={(event) => { setType(event.target.value as ContributionType); setPrepared(false); }}><option value="add">إضافة نشاط أو خدمة</option><option value="correction">تصحيح بيانات سجل</option><option value="missing">نتيجة بحث مفقودة</option></select></label>
          <label><span>اسم النشاط أو الخدمة</span><input style={fieldStyle} required value={name} onChange={(event) => { setName(event.target.value); setPrepared(false); }} placeholder="مثال: معمل تحاليل أو اسم النشاط" /></label>
          <label><span>التصنيف</span><select style={fieldStyle} value={category} onChange={(event) => { setCategory(event.target.value); setPrepared(false); }}><option value="">اختر التصنيف إن كان معروفًا</option>{categories.map((item) => <option key={item.slug} value={item.name}>{item.shortLabel}</option>)}</select></label>
          <label><span>الموضع</span><select style={fieldStyle} value={locality} onChange={(event) => { setLocality(event.target.value); setPrepared(false); }}><option value="">اختر القرية أو الموضع إن كان معروفًا</option>{localities.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></label>
        </div>
        <label style={{ display: 'grid', gap: 8, marginTop: 16 }}><span style={{ color: 'var(--muted)', fontSize: 13 }}>التفاصيل أو المعلومة المطلوب تعديلها</span><textarea style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }} value={details} onChange={(event) => { setDetails(event.target.value); setPrepared(false); }} placeholder="اكتب العنوان أو الهاتف أو وصف الخطأ أو أي تفاصيل تساعد في المراجعة" /></label>
        <label style={{ display: 'grid', gap: 8, marginTop: 16 }}><span style={{ color: 'var(--muted)', fontSize: 13 }}>مصدر عام داعم — موصى به</span><input style={fieldStyle} type="url" value={source} onChange={(event) => { setSource(event.target.value); setPrepared(false); }} placeholder="رابط خرائط Google أو موقع رسمي أو مصدر عام" /></label>
        <label style={{ display: 'grid', gap: 8, marginTop: 16 }}><span style={{ color: 'var(--muted)', fontSize: 13 }}>وسيلة تواصل اختيارية</span><input style={fieldStyle} value={contact} onChange={(event) => { setContact(event.target.value); setPrepared(false); }} placeholder="للتواصل عند الحاجة فقط — اختياري" /></label>
        <div className="detail-actions" style={{ marginTop: 20 }}><button className="button button--primary" type="submit">تجهيز الطلب</button></div>
      </form>

      <aside className="detail-aside">
        <span className="eyebrow eyebrow--dark">قبل الإرسال</span><h2>ما الذي يجعل الطلب قابلًا للاعتماد؟</h2>
        <p className="detail-aside__note">اذكر اسم السجل بوضوح، وحدد المعلومة المطلوب إضافتها أو تعديلها، وأرفق مصدرًا عامًا مباشرًا متى أمكن. لا نستخدم بيانات الاتصال الاختيارية داخل صفحات الدليل.</p>
        {prepared && <div className="source-panel" style={{ marginTop: 16 }}><span>الطلب الجاهز</span><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.9, margin: '10px 0 0' }}>{requestText}</pre></div>}
        {prepared && <div className="detail-actions" style={{ marginTop: 16, display: 'grid' }}><button className="button button--primary" type="button" onClick={copyRequest}>{copied ? 'تم النسخ ✓' : 'نسخ الطلب'}</button><button className="button button--ghost" type="button" onClick={shareRequest}>مشاركة الطلب</button><a className="button button--ghost" href="https://eslam-elshikh.com/" target="_blank" rel="noreferrer" onClick={() => trackEvent('Contribution Contact Opened', { type })}>فتح قناة التواصل ↗</a></div>}
      </aside>
    </div>
  );
}
