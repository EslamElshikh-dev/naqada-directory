'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Category, LocalityPage } from '@/lib/types';
import { submitContribution, trackEvent } from '@/lib/analytics-client';

type ContributionType = 'add' | 'correction' | 'missing';
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const fieldStyle = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: '12px',
  background: '#fff',
  color: 'var(--ink)',
  padding: '12px 13px',
  font: 'inherit',
} as const;

function normalizeType(value: string | null): ContributionType {
  return value === 'correction' || value === 'missing' ? value : 'add';
}

function errorText(error?: string) {
  if (error === 'rate_limited') return 'تم إرسال عدة طلبات من نفس الاتصال خلال وقت قصير. حاول مرة أخرى لاحقًا.';
  if (error === 'invalid_form_timing') return 'تعذر قبول الطلب بهذه السرعة. راجع البيانات ثم أعد الإرسال.';
  if (error === 'origin_not_allowed') return 'تعذر التحقق من مصدر الطلب.';
  if (error === 'network_error') return 'تعذر الاتصال بخدمة المراجعة. يمكنك نسخ الطلب والاحتفاظ به ثم المحاولة مرة أخرى.';
  return 'تعذر حفظ الطلب الآن. لم تُفقد البيانات المكتوبة ويمكنك إعادة المحاولة.';
}

export function ContributionBuilder({ categories, localities }: { categories: Category[]; localities: LocalityPage[] }) {
  const searchParams = useSearchParams();
  const [type, setType] = useState<ContributionType>(() => normalizeType(searchParams.get('type')));
  const [name, setName] = useState(() => searchParams.get('name') || searchParams.get('q') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [locality, setLocality] = useState(() => searchParams.get('locality') || '');
  const [details, setDetails] = useState('');
  const [source, setSource] = useState('');
  const [contact, setContact] = useState('');
  const [listingSlug] = useState(() => searchParams.get('listing') || '');
  const [website, setWebsite] = useState('');
  const [formStartedAt] = useState(() => Date.now());
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [submissionId, setSubmissionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
    ...(listingSlug ? [`السجل المرتبط: ${listingSlug}`] : []),
  ].join('\n'), [category, contact, details, listingSlug, locality, name, source, typeLabel]);

  function markChanged() {
    setPrepared(false);
    setSubmissionId('');
    setErrorMessage('');
    if (status !== 'submitting') setStatus('idle');
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrepared(true);
    setStatus('submitting');
    setErrorMessage('');
    setSubmissionId('');

    trackEvent('Contribution Prepared', {
      type,
      hasSource: Boolean(source),
      hasContact: Boolean(contact),
      category: category || 'unspecified',
      locality: locality || 'unspecified',
    });

    const result = await submitContribution({
      requestType: type,
      name,
      category: category || undefined,
      locality: locality || undefined,
      details: details || undefined,
      sourceUrl: source || undefined,
      contact: contact || undefined,
      listingSlug: listingSlug || undefined,
      formStartedAt,
      website,
    });

    if (result.ok) {
      setStatus('success');
      setSubmissionId(result.id || 'تم الحفظ');
      return;
    }

    setStatus('error');
    setErrorMessage(errorText(result.error));
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
      <form className="detail-card" onSubmit={submitRequest}>
        <div className="detail-card__heading"><span className="eyebrow eyebrow--dark">بيانات المساهمة</span><h2>أرسل الطلب مباشرة إلى قائمة المراجعة</h2></div>
        <div className="detail-grid">
          <label><span>نوع الطلب</span><select style={fieldStyle} value={type} onChange={(event) => { setType(event.target.value as ContributionType); markChanged(); }}><option value="add">إضافة نشاط أو خدمة</option><option value="correction">تصحيح بيانات سجل</option><option value="missing">نتيجة بحث مفقودة</option></select></label>
          <label><span>اسم النشاط أو الخدمة</span><input style={fieldStyle} required maxLength={160} value={name} onChange={(event) => { setName(event.target.value); markChanged(); }} placeholder="مثال: معمل تحاليل أو اسم النشاط" /></label>
          <label><span>التصنيف</span><select style={fieldStyle} value={category} onChange={(event) => { setCategory(event.target.value); markChanged(); }}><option value="">اختر التصنيف إن كان معروفًا</option>{categories.map((item) => <option key={item.slug} value={item.name}>{item.shortLabel}</option>)}</select></label>
          <label><span>الموضع</span><select style={fieldStyle} value={locality} onChange={(event) => { setLocality(event.target.value); markChanged(); }}><option value="">اختر القرية أو الموضع إن كان معروفًا</option>{localities.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></label>
        </div>
        <label style={{ display: 'grid', gap: 8, marginTop: 16 }}><span style={{ color: 'var(--muted)', fontSize: 13 }}>التفاصيل أو المعلومة المطلوب تعديلها</span><textarea style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }} maxLength={2000} value={details} onChange={(event) => { setDetails(event.target.value); markChanged(); }} placeholder="اكتب العنوان أو الهاتف أو وصف الخطأ أو أي تفاصيل تساعد في المراجعة" /></label>
        <label style={{ display: 'grid', gap: 8, marginTop: 16 }}><span style={{ color: 'var(--muted)', fontSize: 13 }}>مصدر عام داعم — موصى به</span><input style={fieldStyle} type="url" maxLength={1000} value={source} onChange={(event) => { setSource(event.target.value); markChanged(); }} placeholder="رابط خرائط Google أو موقع رسمي أو مصدر عام يبدأ بـ https://" /></label>
        <label style={{ display: 'grid', gap: 8, marginTop: 16 }}><span style={{ color: 'var(--muted)', fontSize: 13 }}>وسيلة تواصل اختيارية</span><input style={fieldStyle} maxLength={320} value={contact} onChange={(event) => { setContact(event.target.value); markChanged(); }} placeholder="للتواصل عند الحاجة فقط — اختياري" /></label>
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
        </div>
        <div className="detail-actions" style={{ marginTop: 20 }}><button className="button button--primary" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'جارٍ الإرسال…' : 'إرسال للمراجعة'}</button></div>
      </form>

      <aside className="detail-aside">
        <span className="eyebrow eyebrow--dark">قبل الإرسال</span><h2>ما الذي يجعل الطلب قابلًا للاعتماد؟</h2>
        <p className="detail-aside__note">اذكر اسم السجل بوضوح، وحدد المعلومة المطلوب إضافتها أو تعديلها، وأرفق مصدرًا عامًا مباشرًا متى أمكن. وسيلة التواصل الاختيارية لا تُعرض داخل صفحات الدليل ولا تُرسل ضمن قياسات البحث والاستخدام.</p>
        {status === 'success' && <div className="source-panel" style={{ marginTop: 16 }}><span>تم استلام الطلب للمراجعة ✓</span><strong>مرجع الطلب: {submissionId}</strong><p>الحفظ تم داخل قاعدة مراجعة مستقلة، ولا يُنشر أي تعديل تلقائيًا قبل فحص المصدر.</p></div>}
        {status === 'error' && <div className="source-panel" style={{ marginTop: 16 }}><span>لم يتم حفظ الطلب</span><strong>{errorMessage}</strong><p>يمكنك تعديل أي حقل أو إعادة المحاولة، كما يمكنك نسخ النص أدناه كنسخة احتياطية.</p></div>}
        {prepared && <div className="source-panel" style={{ marginTop: 16 }}><span>نسخة الطلب</span><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.9, margin: '10px 0 0' }}>{requestText}</pre></div>}
        {prepared && <div className="detail-actions" style={{ marginTop: 16, display: 'grid' }}><button className="button button--ghost" type="button" onClick={copyRequest}>{copied ? 'تم النسخ ✓' : 'نسخ الطلب'}</button><button className="button button--ghost" type="button" onClick={shareRequest}>مشاركة الطلب</button><a className="button button--ghost" href="https://eslam-elshikh.com/" target="_blank" rel="noreferrer" onClick={() => trackEvent('Contribution Contact Opened', { type })}>قناة تواصل بديلة ↗</a></div>}
      </aside>
    </div>
  );
}
