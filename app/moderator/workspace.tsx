'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CuratedKind, CuratedRecord, ModeratorDashboard } from '@/lib/auth/moderator';
import { moderatorActionLabel, moderatorKindLabel } from '@/lib/moderator-labels';
import { MemberAvatar } from '@/components/auth/member-avatar';
import { categories, localities } from '@/lib/data';
import styles from './workspace.module.css';

type Tab = 'overview' | 'business' | 'news' | 'article' | 'members' | 'activity';
type SourceItem = { slug: string; title: string; summary: string; category?: string; locality?: string; phone?: string; address?: string; hours?: string; sourceUrl?: string; source?: string };
type Editor = { kind: CuratedKind; origin: 'static' | 'original'; slug: string; status: string; payload: Record<string, string> };

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'overview', label: 'نظرة عامة', icon: '◫' },
  { id: 'business', label: 'الأنشطة', icon: '▦' },
  { id: 'news', label: 'الأخبار', icon: '◉' },
  { id: 'article', label: 'المقالات', icon: '▤' },
  { id: 'members', label: 'الأعضاء', icon: '♙' },
  { id: 'activity', label: 'سجل العمل', icon: '◷' },
];
const statusLabels: Record<string, string> = {
  pending: 'بانتظار المراجعة', reviewing: 'تحت المراجعة', needs_info: 'ينقصه بيان',
  approved: 'معتمد', published: 'منشور', rejected: 'مرفوض', hidden: 'مخفي',
  draft: 'مسودة', active: 'نشط', suspended: 'مقيد مؤقتًا', removed: 'أزيل من الدليل',
};
const kindLabels: Record<CuratedKind, string> = { business: 'نشاط', news: 'خبر', article: 'مقال' };
function number(value: number) { return Number(value || 0).toLocaleString('ar-EG'); }
function date(value: string) { return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date(value)); }
function chartHeight(value: number, maximum: number) { return `${Math.max(value ? 9 : 3, Math.round(value / Math.max(1, maximum) * 100))}%`; }

export function ModeratorWorkspace({ initialDashboard, initialContent, name, avatarUrl }: {
  initialDashboard: ModeratorDashboard; initialContent: CuratedRecord[]; name: string; avatarUrl: string | null;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [content, setContent] = useState(initialContent);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [sourceItems, setSourceItems] = useState<SourceItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<ModeratorDashboard['businesses'][number] | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<ModeratorDashboard['contributions'][number] | null>(null);
  const [memberAction, setMemberAction] = useState<{ id: string; name: string; action: 'suspend' | 'remove' | 'restore' } | null>(null);
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (member = '') => {
    setRefreshing(true);
    try {
      const reply = await fetch(`/api/moderator/overview?member=${encodeURIComponent(member)}`, { cache: 'no-store' });
      const data = await reply.json() as { dashboard?: ModeratorDashboard; content?: CuratedRecord[]; error?: string };
      if (!reply.ok || !data.dashboard || !data.content) throw Error(data.error || 'تعذّر التحديث.');
      setDashboard(data.dashboard); setContent(data.content); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذّر التحديث.'); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refresh]);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get('tab');
    if (!tabs.some((item) => item.id === selected)) return;
    const timer = window.setTimeout(() => setTab(selected as Tab), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!['business', 'news', 'article'].includes(tab)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSources(true);
      try {
        const response = await fetch(`/api/moderator/content?kind=${tab}&q=${encodeURIComponent(search)}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw Error('تعذّر البحث في السجلات.');
        const data = await response.json() as { items: SourceItem[] };
        setSourceItems(data.items);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'تعذّر البحث.');
      } finally { if (!controller.signal.aborted) setLoadingSources(false); }
    }, 320);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [tab, search]);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/moderator/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw Error(result.error || 'تعذّر حفظ التغيير.');
      setMessage('اتحفظ التغيير واتسجل في سجل العمل.');
      setEditor(null); setSelectedBusiness(null); setSelectedContribution(null); setMemberAction(null);
      await refresh(tab === 'members' ? search : '');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذّر تنفيذ الإجراء.'); }
    finally { setBusy(false); }
  }

  function startEdit(kind: CuratedKind, source?: SourceItem) {
    const stored = content.find((item) => item.kind === kind && item.slug === source?.slug);
    const payload = source ? {
      title: source.title, summary: source.summary, category: source.category || '',
      locality: source.locality || '', phone: source.phone || '', address: source.address || '',
      hours: source.hours || '', sourceUrl: source.sourceUrl || '', source: source.source || '',
      body: '', imageUrl: '',
    } : { title: '', summary: '', body: '', category: '', locality: '', phone: '', address: '', hours: '', sourceUrl: '', source: '', imageUrl: '' };
    setEditor({
      kind, origin: stored?.origin || (source ? 'static' : 'original'),
      slug: source?.slug || '', status: stored?.status || 'draft',
      payload: { ...payload, ...stored?.payload },
    });
    setError(''); setMessage('');
  }

  function updateEditor(key: string, value: string) {
    setEditor((current) => current ? { ...current, payload: { ...current.payload, [key]: value } } : null);
  }

  const lastUpdated = useMemo(() => date(dashboard.generatedAt), [dashboard.generatedAt]);
  const maxDaily = Math.max(1, ...dashboard.daily.map((item) => item.views));

  return (
    <>
      <section className={styles.hero}>
        <div><span className={styles.eyebrow}>✦ · مساحة آية رفاعي</span><h1>أهلًا يا {name}، <em>كل الدليل قدامك.</em></h1><p>راجعي الطلبات، حرري المحتوى، وتابعي أثر شغلك على الدليل من مكان واحد.</p><div className={styles.heroLinks}><button type="button" onClick={() => { setTab('business'); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>ابدئي المراجعة ←</button><Link href="/directory">عرض الدليل ↗</Link></div></div>
        <aside className={styles.heroIdentity}><MemberAvatar name={dashboard.viewer?.name || name} src={dashboard.viewer?.avatarUrl || avatarUrl} frame="gold" size={84} priority /><div><span>حساب موثّق</span><strong>مشرفة ذهبية</strong><small>{number(dashboard.metrics.myActions30d)} إجراء مسجّل خلال ٣٠ يومًا</small></div><i>✦</i></aside>
      </section>

      <section className={styles.workspace} id="workspace">
        <header className={styles.workspaceHead}><div><span>مركز التشغيل · أرقام حية من الدليل</span><h2>{tabs.find((item) => item.id === tab)?.label}</h2><p>آخر تحديث {lastUpdated} بتوقيت مصر · تحديث تلقائي كل دقيقة</p></div><button type="button" onClick={() => void refresh(tab === 'members' ? search : '')} disabled={refreshing}>{refreshing ? 'جارٍ التحديث…' : '↻ تحديث البيانات'}</button></header>
        <nav className={styles.tabbar} aria-label="أقسام مساحة الإشراف">{tabs.map((item) => <button key={item.id} className={tab === item.id ? styles.activeTab : ''} type="button" onClick={() => { setTab(item.id); setSearch(''); setSourceItems([]); setEditor(null); setError(''); }} aria-current={tab === item.id ? 'page' : undefined}><span aria-hidden="true">{item.icon}</span>{item.label}{item.id === 'business' && dashboard.metrics.pendingBusinesses ? <b>{number(dashboard.metrics.pendingBusinesses)}</b> : null}</button>)}</nav>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {message ? <p className={styles.success} role="status">{message}</p> : null}

        {tab === 'overview' ? <>
          <div className={styles.metrics}>
            <article><span>زوار فريدون · ٣٠ يوم</span><strong>{number(dashboard.metrics.visitors30d)}</strong><small>{number(dashboard.metrics.visitorsToday)} اليوم</small></article>
            <article><span>زوار جدد · ٣٠ يوم</span><strong>{number(dashboard.metrics.newVisitors30d)}</strong><small>أول زيارة مسجلة للمتصفح</small></article>
            <article><span>مشاهدات الصفحات</span><strong>{number(dashboard.metrics.pageViews30d)}</strong><small>خلال آخر ٣٠ يومًا</small></article>
            <article><span>منتظر المراجعة</span><strong>{number(dashboard.metrics.pendingBusinesses + dashboard.metrics.pendingContributions)}</strong><small>أنشطة ومساهمات</small></article>
            <article><span>الأعضاء</span><strong>{number(dashboard.metrics.members)}</strong><small>حسابات الدليل</small></article>
            <article><span>إجراءاتك · ٣٠ يوم</span><strong>{number(dashboard.metrics.myActions30d)}</strong><small>من سجل العمل الموثق</small></article>
          </div>
          <div className={styles.overviewGrid}>
            <article className={styles.panel}><div className={styles.panelHead}><div><span>حركة الجمهور</span><h3>آخر ١٤ يومًا</h3></div><small>زوار ومشاهدات</small></div><div className={styles.chart} role="img" aria-label="عدد الزيارات والمشاهدات اليومية">{dashboard.daily.map((item) => <div key={item.date} title={`${item.date}: ${number(item.visitors)} زائر، ${number(item.views)} مشاهدة`}><i style={{ height: chartHeight(item.views, maxDaily) }}><b style={{ height: chartHeight(item.visitors, Math.max(item.views, 1)) }} /></i><small>{item.date.slice(-2)}</small></div>)}</div><p className={styles.note}>الزائر الفريد يُحسب بمعرّف المتصفح. قد تشمل الأرقام زيارات فحص غير مصنفة.</p></article>
            <article className={styles.panel}><div className={styles.panelHead}><div><span>ما يحتاج انتباهك</span><h3>طابور المراجعة</h3></div></div><div className={styles.queue}><button onClick={() => setTab('business')}><b>{number(dashboard.metrics.pendingBusinesses)}</b><span>أنشطة تنتظر مراجعتك</span><i>←</i></button><button onClick={() => setTab('business')}><b>{number(dashboard.metrics.pendingContributions)}</b><span>طلبات إضافة وتصحيح</span><i>←</i></button><button onClick={() => setTab('members')}><b>{number(dashboard.metrics.members)}</b><span>الأعضاء وحالة حساباتهم</span><i>←</i></button></div></article>
            <article className={styles.panel}><div className={styles.panelHead}><div><span>الطلب الفعلي</span><h3>أكثر الصفحات مشاهدة</h3></div></div>{dashboard.topPages.length ? <div className={styles.rank}>{dashboard.topPages.map((row, index) => <div key={row.path}><span>{String(index + 1).padStart(2, '0')}</span><b dir="ltr">{row.path}</b><strong>{number(row.views)}</strong></div>)}</div> : <p className={styles.empty}>هنا تظهر الصفحات بعد تسجيل زيارات.</p>}</article>
            <article className={styles.panel}><div className={styles.panelHead}><div><span>فرص تحسين الدليل</span><h3>بحث بلا نتيجة</h3></div></div>{dashboard.missedSearches.length ? <div className={styles.rank}>{dashboard.missedSearches.map((row, index) => <div key={row.query}><span>{String(index + 1).padStart(2, '0')}</span><b>{row.query}</b><strong>{number(row.count)}</strong></div>)}</div> : <p className={styles.empty}>لا توجد عبارات بحث دون نتيجة في الفترة الحالية.</p>}</article>
          </div>
        </> : null}

        {tab === 'business' ? <div className={styles.sectionStack}>
          <div className={styles.sectionTitle}><div><span>مراجعة قبل النشر</span><h3>الأنشطة التي أضافها أصحابها</h3><p>راجعي الاسم ووسيلة التواصل والمكان والوصف، ثم انشري أو اطلبي التصحيح.</p></div></div>
          <div className={styles.records}>{dashboard.businesses.length ? dashboard.businesses.map((item) => <article key={item.id}><span className={styles.status}>{statusLabels[item.status] || item.status}</span><h4>{item.name}</h4><p>{item.description}</p><small>{item.category} · {item.locality} · {date(item.created_at)}</small><button type="button" onClick={() => setSelectedBusiness(item)}>مراجعة النشاط ←</button></article>) : <p className={styles.empty}>لا توجد أنشطة مقدمة للمراجعة حتى الآن.</p>}</div>
          <div className={styles.sectionTitle}><div><span>مساهمات المجتمع</span><h3>طلبات الإضافة والتصحيح</h3><p>الاعتماد يسجل نتيجة المراجعة؛ نشر نشاط جديد يتم من سجل الأنشطة بعد فحص بياناته.</p></div></div>
          <div className={styles.records}>{dashboard.contributions.length ? dashboard.contributions.map((item) => <article key={item.id}><span className={styles.status}>{statusLabels[item.status] || item.status}</span><h4>{item.name}</h4><p>{item.details}</p><small>{item.category || 'دون قسم'} · {item.locality || 'دون موضع'} · {date(item.created_at)}</small><button type="button" onClick={() => setSelectedContribution(item)}>فتح الطلب ←</button></article>) : <p className={styles.empty}>لم تصل طلبات إضافة أو تصحيح بعد.</p>}</div>
          <div className={styles.sectionTitle}><div><span>السجلات المنشورة</span><h3>إدارة أنشطة الدليل الحالية</h3></div><button type="button" onClick={() => startEdit('business')}>+ إضافة نشاط</button></div>
          <ContentList kind="business" {...{ search, setSearch, sourceItems, content, loadingSources, startEdit }} />
        </div> : null}

        {(tab === 'news' || tab === 'article') ? <div className={styles.sectionStack}>
          <div className={styles.sectionTitle}><div><span>تحرير ومراجعة</span><h3>{tab === 'news' ? 'الأخبار المحلية' : 'المقالات'}</h3><p>{tab === 'news' ? 'العناوين الخارجية تظل مرتبطة بناشرها الأصلي. اكتبي الخبر المحلي باسم الدليل من «إضافة خبر».' : 'تقدري تحرري عنوان وملخص مقال منشور أو تضيفي مقالًا أصليًا كاملًا.'}</p></div><button type="button" onClick={() => startEdit(tab)}>+ إضافة {tab === 'news' ? 'خبر' : 'مقال'}</button></div>
          <ContentList kind={tab} {...{ search, setSearch, sourceItems, content, loadingSources, startEdit }} />
        </div> : null}

        {tab === 'members' ? <div className={styles.sectionStack}>
          <div className={styles.sectionTitle}><div><span>العناية بالمجتمع</span><h3>الأعضاء</h3><p>التقييد مؤقت وله تاريخ انتهاء. «الإزالة» توقف الحساب داخل الدليل وتخفي تقييماته؛ ويمكن للمالك إعادة تفعيله.</p></div></div>
          <div className={styles.searchRow}><input aria-label="ابحث بالبريد الإلكتروني" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالبريد الإلكتروني…" /><button type="button" onClick={() => void refresh(search)} disabled={refreshing}>بحث</button></div>
          <div className={styles.memberList}>{dashboard.members.length ? dashboard.members.map((member) => { const status = member.status === 'suspended' && member.until && new Date(member.until) <= new Date() ? 'active' : member.status; return <article key={member.id}><div className={styles.memberIcon}>{member.name.charAt(0)}</div><div><strong>{member.name}</strong><small dir="ltr">{member.email}</small><span>انضم {date(member.createdAt)} · {member.role || 'عضو'} · {statusLabels[status] || status}{status === 'suspended' && member.until ? ` حتى ${date(member.until)}` : ''}</span></div><div className={styles.rowActions}>{status !== 'active' ? <button type="button" onClick={() => setMemberAction({ id: member.id, name: member.name, action: 'restore' })}>إعادة التنشيط</button> : <><button type="button" onClick={() => setMemberAction({ id: member.id, name: member.name, action: 'suspend' })}>تقييد مؤقت</button><button type="button" className={styles.danger} onClick={() => setMemberAction({ id: member.id, name: member.name, action: 'remove' })}>إزالة</button></>}</div></article>; }) : <p className={styles.empty}>لم يظهر عضو مطابق. جرّب بريدًا آخر.</p>}</div>
        </div> : null}

        {tab === 'activity' ? <div className={styles.sectionStack}><div className={styles.sectionTitle}><div><span>شفافية الإجراءات</span><h3>أعمالك المسجلة</h3><p>كل تعديل موثق باسم الحساب ووقت التنفيذ. يظهر ملخص عملك أيضًا في لوحة مالك الدليل.</p></div></div><div className={styles.timeline}>{dashboard.activity.length ? dashboard.activity.map((item, index) => <article key={`${item.at}-${index}`}><i>✦</i><div><strong>{moderatorActionLabel(item.action)}</strong><small>{moderatorKindLabel(item.kind)} · {item.target}</small></div><time>{date(item.at)}</time></article>) : <p className={styles.empty}>لسه ما اتسجلش إجراء. أول مراجعة هتظهر هنا.</p>}</div></div> : null}
      </section>

      {editor ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}><section className={styles.drawer} role="dialog" aria-modal="true" aria-label={`تحرير ${kindLabels[editor.kind]}`}><header><div><small>{editor.origin === 'static' ? 'تعديل سجل موجود' : 'محتوى جديد'}</small><h2>تحرير {kindLabels[editor.kind]}</h2></div><button type="button" onClick={() => setEditor(null)} aria-label="إغلاق">×</button></header><form onSubmit={(event: FormEvent) => { event.preventDefault(); void act({ type: 'content', ...editor, status: 'published' }); }}>
        <label>العنوان أو اسم النشاط<input required minLength={3} maxLength={160} value={editor.payload.title || ''} onChange={(event) => updateEditor('title', event.target.value)} /></label>
        <label>الملخص أو الوصف القصير<textarea required minLength={15} maxLength={500} rows={3} value={editor.payload.summary || ''} onChange={(event) => updateEditor('summary', event.target.value)} /></label>
        {editor.kind !== 'business' ? <label>النص الكامل {editor.origin === 'static' ? '(اتركيه فارغًا للاحتفاظ بنص المقال الحالي)' : ''}<textarea required={editor.origin === 'original'} minLength={editor.origin === 'original' ? 40 : undefined} maxLength={8000} rows={11} value={editor.payload.body || ''} onChange={(event) => updateEditor('body', event.target.value)} placeholder="اكتبي فقرات واضحة وبين كل فقرة والثانية سطر فارغ…" /></label> : null}
        {editor.kind === 'business' ? <div className={styles.formGrid}><label>القسم<select required={editor.origin === 'original'} value={editor.payload.category || ''} onChange={(event) => updateEditor('category', event.target.value)}><option value="">اختاري القسم</option>{categories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}</select></label><label>القرية أو الموضع<select required={editor.origin === 'original'} value={editor.payload.locality || ''} onChange={(event) => updateEditor('locality', event.target.value)}><option value="">اختاري المكان</option>{localities.map((locality) => <option key={locality.name} value={locality.name}>{locality.name}</option>)}</select></label><label>رقم التواصل<input inputMode="tel" dir="ltr" value={editor.payload.phone || ''} onChange={(event) => updateEditor('phone', event.target.value)} /></label><label>ساعات العمل<input value={editor.payload.hours || ''} onChange={(event) => updateEditor('hours', event.target.value)} /></label><label className={styles.full}>العنوان<input value={editor.payload.address || ''} onChange={(event) => updateEditor('address', event.target.value)} /></label></div> : <div className={styles.formGrid}><label>التصنيف<input value={editor.payload.category || ''} onChange={(event) => updateEditor('category', event.target.value)} /></label><label>المنطقة<input value={editor.payload.locality || ''} onChange={(event) => updateEditor('locality', event.target.value)} /></label>{editor.kind === 'news' && editor.origin === 'static' ? <label className={styles.full}>رابط المصدر<input type="url" dir="ltr" readOnly value={editor.payload.sourceUrl || ''} /></label> : null}</div>}
        <div className={styles.formActions}><button type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ ونشر'}</button><button type="button" disabled={busy} onClick={() => void act({ type: 'content', ...editor, status: 'draft' })}>حفظ مسودة</button>{editor.slug ? <button type="button" className={styles.danger} disabled={busy} onClick={() => { if (window.confirm('سيُخفى هذا المحتوى من العرض العام. متأكد؟')) void act({ type: 'content', ...editor, status: 'hidden' }); }}>إخفاء من الموقع</button> : null}</div>
        <p className={styles.note}>التعديلات المحفوظة كمسودة لا تظهر للزوار. راجعي صحة المعلومات ومصدرها قبل النشر.</p>
      </form></section></div> : null}

      {selectedBusiness ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBusiness(null); }}><section className={styles.drawer} role="dialog" aria-modal="true" aria-label="مراجعة نشاط"><header><div><small>طلب من مالك النشاط</small><h2>مراجعة النشاط</h2></div><button type="button" onClick={() => setSelectedBusiness(null)} aria-label="إغلاق">×</button></header><form onSubmit={(event) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget).entries()); void act({ type: 'submission', kind: 'business', id: selectedBusiness.id, status: 'published', patch: fields }); }}><label>اسم النشاط<input name="name" defaultValue={selectedBusiness.name} required /></label><div className={styles.formGrid}><label>رقم الجوال<input name="phone" defaultValue={selectedBusiness.phone} dir="ltr" required /></label><label>المواعيد<input name="hours" defaultValue={selectedBusiness.hours} required /></label><label>القسم<input name="category" defaultValue={selectedBusiness.category} required /></label><label>المكان<input name="locality" defaultValue={selectedBusiness.locality} required /></label></div><label>العنوان<input name="address" defaultValue={selectedBusiness.address} required /></label><label>الوصف<textarea name="description" defaultValue={selectedBusiness.description} rows={5} required /></label>{selectedBusiness.photo_paths?.length ? <div className={styles.photoPreviews}>{selectedBusiness.photo_paths.map((path, index) => <Image key={path} src={`/api/directory/photo?path=${encodeURIComponent(path)}&preview=1`} alt={`صورة ${index + 1} لنشاط ${selectedBusiness.name}`} width={240} height={160} unoptimized />)}</div> : <p className={styles.note}>لم تُرفق صور بهذا الطلب.</p>}<div className={styles.formActions}><button type="submit" disabled={busy}>اعتماد ونشر</button><button type="button" disabled={busy} onClick={() => void act({ type: 'submission', kind: 'business', id: selectedBusiness.id, status: 'rejected' })}>رفض الطلب</button></div></form></section></div> : null}

      {selectedContribution ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedContribution(null); }}><section className={styles.drawer} role="dialog" aria-modal="true" aria-label="مراجعة مساهمة"><header><div><small>طلب من المجتمع</small><h2>مراجعة {selectedContribution.name}</h2></div><button type="button" onClick={() => setSelectedContribution(null)} aria-label="إغلاق">×</button></header><form onSubmit={(event) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget).entries()); void act({ type: 'submission', kind: 'contribution', id: selectedContribution.id, status: 'approved', patch: fields }); }}><label>اسم النشاط<input name="name" defaultValue={selectedContribution.name} required /></label><div className={styles.formGrid}><label>القسم<input name="category" defaultValue={selectedContribution.category} /></label><label>المكان<input name="locality" defaultValue={selectedContribution.locality} /></label></div><label>تفاصيل الطلب<textarea name="details" defaultValue={selectedContribution.details} rows={5} /></label><label>ملاحظات المراجعة<textarea name="notes" defaultValue={selectedContribution.review_notes || ''} rows={3} /></label><div className={styles.formActions}><button type="submit" disabled={busy}>اعتماد المراجعة</button><button type="button" disabled={busy} onClick={() => void act({ type: 'submission', kind: 'contribution', id: selectedContribution.id, status: 'needs_info' })}>يحتاج استكمال</button><button type="button" disabled={busy} className={styles.danger} onClick={() => void act({ type: 'submission', kind: 'contribution', id: selectedContribution.id, status: 'rejected' })}>رفض</button></div></form></section></div> : null}

      {memberAction ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setMemberAction(null); }}><section className={styles.drawer} role="dialog" aria-modal="true" aria-label="إدارة عضو"><header><div><small>إدارة العضوية</small><h2>{memberAction.name}</h2></div><button type="button" onClick={() => setMemberAction(null)} aria-label="إغلاق">×</button></header><form onSubmit={(event) => { event.preventDefault(); if (memberAction.action === 'remove' && !window.confirm('سيُوقف الحساب وتُخفى تقييماته. هل تريد المتابعة؟')) return; void act({ type: 'member', ...memberAction, until: until ? new Date(until).toISOString() : null, reason }); }}><p>{memberAction.action === 'suspend' ? 'حدد موعدًا لانتهاء التقييد. يعود الحساب للعمل تلقائيًا عند انقضاء المدة.' : memberAction.action === 'remove' ? 'الإزالة تمنع استخدام الحساب داخل الدليل وتخفي تقييماته، مع الاحتفاظ بسجل الإجراءات.' : 'سيعود العضو لاستخدام حسابه في الدليل.'}</p>{memberAction.action === 'suspend' ? <label>نهاية التقييد بتوقيت جهازك<input type="datetime-local" required value={until} onChange={(event) => setUntil(event.target.value)} /></label> : null}<label>سبب الإجراء<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="اختياري؛ يظهر في سجل الإدارة فقط" /></label><div className={styles.formActions}><button type="submit" disabled={busy}>{busy ? 'جارٍ التنفيذ…' : memberAction.action === 'suspend' ? 'تأكيد التقييد' : memberAction.action === 'remove' ? 'إزالة العضو' : 'إعادة التنشيط'}</button></div></form></section></div> : null}

      {tab === 'overview' ? <section className={styles.reviews}><div className={styles.sectionTitle}><div><span>رأي أهل نقادة</span><h3>تقييمات تحتاج متابعة</h3></div></div><div className={styles.records}>{dashboard.reviews.slice(0, 6).map((review) => <article key={review.id}><span className={styles.status}>{statusLabels[review.status]}</span><h4>{review.author_name} · {number(review.rating)} / ٥</h4><p>{review.body}</p><button type="button" disabled={busy} onClick={() => void act({ type: 'submission', kind: 'review', id: review.id, status: review.status === 'hidden' ? 'published' : 'hidden' })}>{review.status === 'hidden' ? 'إظهار التقييم' : 'إخفاء التقييم'}</button></article>)}</div></section> : null}
    </>
  );
}

function ContentList({ kind, search, setSearch, sourceItems, content, loadingSources, startEdit }: {
  kind: CuratedKind; search: string; setSearch: (value: string) => void;
  sourceItems: SourceItem[]; content: CuratedRecord[]; loadingSources: boolean;
  startEdit: (kind: CuratedKind, source?: SourceItem) => void;
}) {
  const originals = content.filter((item) => item.kind === kind && item.origin === 'original'
    && (!search || (item.payload.title || '').toLocaleLowerCase('ar-EG').includes(search.toLocaleLowerCase('ar-EG'))));
  return <><div className={styles.searchRow}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو المكان…" aria-label="ابحث في المحتوى" />{loadingSources ? <span>جارٍ البحث…</span> : null}</div><div className={styles.contentList}>{originals.map((item) => <article key={item.slug}><div><span className={styles.status}>{statusLabels[item.status]}</span><h4>{item.payload.title || 'مسودة دون عنوان'}</h4><p>{item.payload.summary}</p><small>محتوى أصلي · {date(item.updatedAt)}</small></div><button type="button" onClick={() => startEdit(kind, { slug: item.slug, title: item.payload.title || '', summary: item.payload.summary || '' })}>تعديل ←</button></article>)}{sourceItems.map((item) => { const record = content.find((stored) => stored.kind === kind && stored.slug === item.slug && stored.origin === 'static'); return <article key={item.slug}><div><span className={styles.status}>{record ? statusLabels[record.status] : 'منشور'}</span><h4>{record?.payload.title || item.title}</h4><p>{record?.payload.summary || item.summary}</p><small>{kind === 'news' ? item.source || 'مصدر خارجي' : item.category || 'الدليل'} · أصل منشور</small></div><button type="button" onClick={() => startEdit(kind, item)}>مراجعة وتعديل ←</button></article>; })}{!originals.length && !sourceItems.length && !loadingSources ? <p className={styles.empty}>لا توجد نتائج مطابقة حاليًا.</p> : null}</div></>;
}
