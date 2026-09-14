'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Category, LocalityPage } from '@/lib/types';
import { submitContribution, trackEvent } from '@/lib/analytics-client';

type ContributionType = 'add' | 'correction' | 'missing';
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const typeOptions: Array<{ value: ContributionType; label: string; description: string }> = [
  { value: 'add', label: 'إضافة نشاط', description: 'نشاط أو خدمة غير موجودة في الدليل.' },
  { value: 'correction', label: 'تصحيح بيانات', description: 'رقم أو عنوان أو تصنيف يحتاج مراجعة.' },
  { value: 'missing', label: 'نتيجة مفقودة', description: 'بحثت عن خدمة ولم تجد النتيجة المناسبة.' },
];

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
    `الاسم أو الخدمة: ${name.trim() || 'غير محدد'}`,
    `التصنيف: ${category || 'غير محدد'}`,
    `الموضع: ${locality || 'غير محدد'}`,
    `التفاصيل: ${details.trim() || 'لا توجد تفاصيل إضافية'}`,
    `مصدر عام داعم: ${source.trim() || 'غير مرفق'}`,
    `وسيلة تواصل اختيارية: ${contact.trim() || 'غير مضافة'}`,
    ...(listingSlug ? [`السجل المرتبط: ${listingSlug}`] : []),
  ].join('\n'), [category, contact, details, listingSlug, locality, name, source, typeLabel]);

  const readinessItems = useMemo(() => [
    { label: 'اسم واضح للنشاط أو الخدمة', done: Boolean(name.trim()) },
    { label: 'موضع أو تصنيف يساعد في التحديد', done: Boolean(locality || category) },
    { label: 'تفاصيل تشرح المطلوب', done: details.trim().length >= 10 },
    { label: 'مصدر عام داعم', done: Boolean(source.trim()) },
  ], [category, details, locality, name, source]);
  const readinessCount = readinessItems.filter((item) => item.done).length;
  const readinessLabel = readinessCount === readinessItems.length
    ? 'جاهز للمراجعة'
    : readinessCount >= 3
      ? 'طلب جيد'
      : 'أضف تفاصيل أكثر';

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
      name: name.trim(),
      category: category || undefined,
      locality: locality || undefined,
      details: details.trim() || undefined,
      sourceUrl: source.trim() || undefined,
      contact: contact.trim() || undefined,
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
    <div className="contribution-workspace">
      <form className="contribution-card contribution-form" onSubmit={submitRequest} aria-busy={status === 'submitting'}>
        <div className="contribution-heading">
          <span className="eyebrow eyebrow--dark">بيانات المساهمة</span>
          <h2>أرسل طلبًا واضحًا إلى قائمة المراجعة</h2>
          <p>كلما كان الاسم والموضع والمصدر أوضح، كانت مراجعة الطلب أسرع وأسهل.</p>
        </div>

        {listingSlug && (
          <div className="contribution-context">
            <div><span>تصحيح مرتبط بسجل موجود</span><strong>{name.trim() || listingSlug}</strong></div>
            <Link href={`/listing/${listingSlug}`}>فتح السجل الحالي ←</Link>
          </div>
        )}

        <fieldset className="contribution-type-fieldset">
          <legend>ما نوع المساهمة؟</legend>
          <div className="contribution-type-grid">
            {typeOptions.map((option) => (
              <label key={option.value} className={`contribution-type-option${type === option.value ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="contribution-type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => { setType(option.value); markChanged(); }}
                />
                <span className="contribution-type-mark" aria-hidden="true">{option.value === 'add' ? '+' : option.value === 'correction' ? '✓' : '?'}</span>
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="contribution-fields">
          <label className="contribution-field">
            <span>اسم النشاط أو الخدمة <b>مطلوب</b></span>
            <input className="contribution-input" required maxLength={160} value={name} onChange={(event) => { setName(event.target.value); markChanged(); }} placeholder="مثال: معمل تحاليل أو اسم النشاط" />
          </label>
          <label className="contribution-field">
            <span>التصنيف</span>
            <select className="contribution-input" value={category} onChange={(event) => { setCategory(event.target.value); markChanged(); }}>
              <option value="">اختر التصنيف إن كان معروفًا</option>
              {categories.map((item) => <option key={item.slug} value={item.name}>{item.shortLabel}</option>)}
            </select>
          </label>
          <label className="contribution-field">
            <span>الموضع</span>
            <select className="contribution-input" value={locality} onChange={(event) => { setLocality(event.target.value); markChanged(); }}>
              <option value="">اختر القرية أو الموضع إن كان معروفًا</option>
              {localities.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className="contribution-field contribution-field--wide">
            <span>التفاصيل أو المعلومة المطلوب تعديلها</span>
            <textarea className="contribution-input contribution-textarea" maxLength={2000} value={details} onChange={(event) => { setDetails(event.target.value); markChanged(); }} placeholder="اكتب العنوان أو الهاتف أو وصف الخطأ أو أي تفاصيل تساعد في المراجعة" />
          </label>
          <label className="contribution-field contribution-field--wide">
            <span>مصدر عام داعم <b>موصى به</b></span>
            <input className="contribution-input" type="url" maxLength={1000} value={source} onChange={(event) => { setSource(event.target.value); markChanged(); }} placeholder="رابط خرائط Google أو موقع رسمي أو مصدر عام يبدأ بـ https://" />
            <small>المصدر يساعدنا على التحقق، لكنه لا يجعل التعديل يُنشر تلقائيًا.</small>
          </label>
          <label className="contribution-field contribution-field--wide">
            <span>وسيلة تواصل اختيارية</span>
            <input className="contribution-input" maxLength={320} value={contact} onChange={(event) => { setContact(event.target.value); markChanged(); }} placeholder="للتواصل عند الحاجة فقط — اختياري" />
            <small>لا تظهر داخل صفحات الدليل ولا تُرسل ضمن قياسات البحث والاستخدام.</small>
          </label>
        </div>

        <div className="contribution-honeypot" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
        </div>

        <div className="contribution-actions">
          <button className="button button--primary" type="submit" disabled={status === 'submitting' || !name.trim()}>{status === 'submitting' ? 'جارٍ الإرسال…' : 'إرسال للمراجعة'}</button>
          <button className="button button--ghost" type="button" disabled={!name.trim()} onClick={() => setPrepared(true)}>معاينة ملخص الطلب</button>
        </div>
      </form>

      <aside className="contribution-aside">
        <div className="contribution-readiness">
          <div className="contribution-readiness-head"><span>جاهزية الطلب</span><strong>{readinessCount}/{readinessItems.length} · {readinessLabel}</strong></div>
          <progress max={readinessItems.length} value={readinessCount} aria-label={`جاهزية الطلب ${readinessCount} من ${readinessItems.length}`} />
          <ul>
            {readinessItems.map((item) => <li key={item.label} className={item.done ? 'is-done' : ''}><span aria-hidden="true">{item.done ? '✓' : '○'}</span>{item.label}</li>)}
          </ul>
          <p>يمكن إرسال الطلب بمجرد كتابة الاسم. العناصر الأخرى ترفع جودة المراجعة ولا تُعامل كمتطلبات إلزامية.</p>
        </div>

        <div className="contribution-guidance">
          <span className="eyebrow eyebrow--dark">قبل الإرسال</span>
          <h2>ماذا يحدث بعد الضغط على الإرسال؟</h2>
          <ol>
            <li><b>استلام</b><span>يحصل الطلب على مرجع مراجعة.</span></li>
            <li><b>تحقق</b><span>تُراجع المعلومة والمصدر والسجل المرتبط إن وجد.</span></li>
            <li><b>قرار نشر</b><span>لا يتغير الدليل قبل اجتياز المراجعة.</span></li>
          </ol>
        </div>

        <div className="contribution-live" aria-live="polite" aria-atomic="true">
          {status === 'success' && <div className="contribution-status is-success" role="status"><span>تم استلام الطلب للمراجعة ✓</span><strong>مرجع الطلب: {submissionId}</strong><p>احتفظ بالمرجع إذا احتجت الرجوع إلى الطلب. لا يُنشر أي تعديل تلقائيًا قبل فحص المصدر.</p></div>}
          {status === 'error' && <div className="contribution-status is-error" role="alert"><span>لم يتم حفظ الطلب</span><strong>{errorMessage}</strong><p>يمكنك تعديل أي حقل أو إعادة المحاولة، كما يمكنك نسخ النص أدناه كنسخة احتياطية.</p></div>}
        </div>

        {prepared && <div className="contribution-preview"><span>معاينة الطلب</span><pre>{requestText}</pre></div>}
        {prepared && <div className="contribution-share-actions"><button className="button button--ghost" type="button" onClick={copyRequest}>{copied ? 'تم النسخ ✓' : 'نسخ الطلب'}</button><button className="button button--ghost" type="button" onClick={shareRequest}>مشاركة الطلب</button><a className="button button--ghost" href="https://eslam-elshikh.com/" target="_blank" rel="noreferrer" onClick={() => trackEvent('Contribution Contact Opened', { type })}>قناة تواصل بديلة ↗</a></div>}
      </aside>
    </div>
  );
}
