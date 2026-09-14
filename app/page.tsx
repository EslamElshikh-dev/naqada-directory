import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { CategoryVisual } from '@/components/category-visual';
import { CategoryCover } from '@/components/category-cover';
import { ListingCard } from '@/components/listing-card';
import { HomeSmartSearch } from '@/components/home-smart-search';
import { businesses, categories, families, featuredBusinesses, landmarks, localities, meta, officialLocalities, people } from '@/lib/data';
import { siteConfig } from '@/lib/site';
import { villageArticleAuthor } from '@/lib/village-articles';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { fieldInformants, knowledgeHeritage, knowledgePeople, knowledgePlaces, knowledgeReferences, primaryKnowledgeContributor } from '@/lib/knowledge';
import { SiteReviews } from '@/components/site-reviews';
import { ActionIcon } from '@/components/action-icon';
import { activityLandings, getBusinessesForActivity } from '@/lib/activity-landings';
import blogStyles from './blog/blog.module.css';
import knowledgeStyles from './knowledge/knowledge.module.css';

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

const quickCategories = ['الطب والصحة', 'التجزئة والتسوق', 'التعليم', 'المطاعم والأطعمة'];
const priorityLocalityNames = ['بشلاو', 'الأوسط قمولا', 'طوخ', 'الخطارة', 'دنفيق'];
const priorityActivityNames = ['صيدليات نقادة', 'أطباء وعيادات نقادة', 'مدارس ومعاهد نقادة', 'مطاعم ومقاهي نقادة', 'محلات وأسواق نقادة'];
const faq = [
  { question: 'ما الذي يقدمه دليل نقادة؟', answer: 'ينظم الأنشطة والخدمات والقرى والنجوع والسجل العائلي والتراثي لمركز نقادة في صفحات واضحة وسهلة البحث.' },
  { question: 'هل ظهور النشاط يعني أنه معتمد رسميًا؟', answer: 'لا. الدليل منصة معلوماتية مستقلة، ويعرض مصدر البيانات وتاريخ المراجعة بقدر ما تسمح به المادة المتاحة.' },
  { question: 'كيف تُعرض معلومات العائلات؟', answer: 'لا تُنشر إلا الحالات التي اجتازت معيار النشر، ولا يُستنتج نسب أو ارتباط من تشابه الأسماء.' },
  { question: 'هل تشمل التغطية كل قرى نقادة؟', answer: 'الهيكل الجغرافي يشمل المواضع الموثقة، بينما يزداد عدد الأنشطة والتفاصيل تدريجيًا مع اكتمال المراجعة.' },
];

export default function HomePage() {
  const topLocalities = officialLocalities.filter((item) => item.businessCount > 0).slice(0, 12);
  const priorityLocalities = priorityLocalityNames
    .map((name) => localities.find((item) => item.name === name))
    .filter((item): item is (typeof localities)[number] => Boolean(item));
  const featuredLocalityGuides = [
    ...priorityLocalities,
    ...topLocalities.filter((item) => !priorityLocalityNames.includes(item.name)),
  ].slice(0, 8);
  const priorityActivities = priorityActivityNames
    .map((name) => activityLandings.find((item) => item.name === name))
    .filter((item): item is (typeof activityLandings)[number] => Boolean(item));
  const featuredActivities = [
    ...priorityActivities,
    ...activityLandings.filter((item) => !priorityActivityNames.includes(item.name)),
  ].slice(0, 8);
  const recentlyReviewed = [...businesses]
    .filter((item) => Boolean(item.checked))
    .sort((a, b) => (b.checked || '').localeCompare(a.checked || '') || (b.reviews || 0) - (a.reviews || 0))
    .slice(0, 6);
  const featuredArticles = allEditorialPosts.slice(0, 4);
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل وموسوعة مركز نقادة',
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    dateModified: meta.updatedAt,
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر', address: { '@type': 'PostalAddress', addressRegion: 'قنا', addressCountry: 'EG' } },
    contributor: { '@type': 'Person', name: primaryKnowledgeContributor.name, url: `${siteConfig.url}/contributors/${primaryKnowledgeContributor.slug}` },
  };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) };

  return (
    <main id="main-content">
      <section className="hero home-hero">
        <div className="hero__mesh" aria-hidden="true" />
        <div className="shell hero__grid">
          <div className="hero__content">
            <div className="hero__meta-line"><span>مركز نقادة · محافظة قنا</span></div>
            <span className="eyebrow">خدمات اليوم، وحكاية المكان</span>
            <h1>دليل نقادة<span className="home-hero__title-line">اكتشف <em>المكان وأهله.</em></span></h1>
            <p>اعثر على خدمة قريبة، وتعرّف إلى قرى نقادة وأعلامها وتراثها من مصادرها.</p>
            <HomeSmartSearch />
            <div className="hero__quick-links"><span>وصول سريع</span>{quickCategories.map((name) => { const category = categories.find((item) => item.name === name); return category ? <Link key={category.slug} href={`/directory/${category.slug}`}>{category.shortLabel}</Link> : null; })}<Link href="/villages">دليل القرى</Link><Link href="/knowledge">الموسوعة</Link><Link href="/blog">المدونة</Link></div>
            <div className="hero__trust">
              <span><b>{meta.businessCount.toLocaleString('ar-EG')}</b><small>نشاطًا وخدمة</small></span>
              <span><b>{meta.localityCount.toLocaleString('ar-EG')}</b><small>قرية وموضعًا</small></span>
              <span><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString('ar-EG')}</b><small>علمًا ومعلمًا</small></span>
            </div>
          </div>
          <aside className="hero__panel" aria-label="نطاق التغطية">
            <div className="hero__panel-brand"><BrandMark /><i /></div>
            <div className="hero__panel-head"><div><span>نطاق التغطية</span><strong>من قلب مركز نقادة</strong></div><span className="panel-status"><i /> محلي</span></div>
            <div className="hero__panel-stat"><strong>{meta.businessCount.toLocaleString('ar-EG')}</strong><div><b>مكان وخدمة</b><span>منظّمان داخل دليل واحد</span></div></div>
            <span className="hero__panel-label">استكشف حسب المكان</span>
            <div className="village-cloud">{topLocalities.map((item) => <Link key={item.slug} href={`/villages/${item.slug}`}>{item.name}</Link>)}</div>
            <Link href="/villages" className="text-link text-link--light">كل أدلة القرى والنجوع <ActionIcon name="arrow" className="inline-arrow" /></Link>
          </aside>
        </div>
      </section>

      <nav className="shell home-actions" aria-label="مسارات الوصول الرئيسية">
        <Link href="/directory" className="home-action home-action--featured">
          <span className="home-action__icon"><ActionIcon name="arrow" /></span>
          <span><small>وصول مباشر</small><strong>ابحث في دليل الخدمات</strong></span>
          <b>{meta.businessCount.toLocaleString('ar-EG')}</b>
        </Link>
        <Link href="/villages" className="home-action">
          <span className="home-action__icon"><ActionIcon name="map" /></span>
          <span><small>حسب موقعك</small><strong>دليل القرى والنجوع</strong></span>
          <b>{meta.localityCount.toLocaleString('ar-EG')}</b>
        </Link>
        <Link href="/knowledge" className="home-action">
          <span className="home-action__icon"><ActionIcon name="landmark" /></span>
          <span><small>بالمصدر والإسناد</small><strong>موسوعة نقادة</strong></span>
          <ActionIcon name="arrow" className="home-action__arrow" />
        </Link>
        <Link href="/contribute" className="home-action home-action--contribute">
          <span className="home-action__icon"><ActionIcon name="add" /></span>
          <span><small>شارك في الدليل</small><strong>أضف نشاطًا</strong></span>
          <ActionIcon name="arrow" className="home-action__arrow" />
        </Link>
      </nav>

      <section className="section shell">
        <div className="section-heading"><div><span className="eyebrow eyebrow--dark">أقسام الدليل</span><h2>ابدأ بنوع الخدمة التي تحتاجها</h2><p>اختر قسمًا، ثم حدّد القرية للوصول إلى ما تحتاجه.</p></div><Link href="/directory" className="text-link">عرض الدليل بالكامل <ActionIcon name="arrow" className="inline-arrow" /></Link></div>
        <div className="category-grid">{categories.slice(0, 12).map((category, index) => (
          <Link key={category.slug} href={`/directory/${category.slug}`} className="category-card">
            <CategoryCover category={category.name} index={index} />
            <h3>{category.shortLabel}</h3><p>{category.description}</p>
            <div className="category-card__footer"><b>{category.count.toLocaleString('ar-EG')} نتيجة</b><span>استكشف <ActionIcon name="arrow" className="inline-arrow" /></span></div>
          </Link>
        ))}</div>
      </section>

      <section className="section section--muted">
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow eyebrow--dark">من موسوعة نقادة المرجعية</span><h2>نقادة: المكان والناس والتراث</h2><p>اكتشف حكايات القرى وأعلامها ومعالمها، مع المراجع وأسماء المساهمين.</p></div><Link href="/knowledge" className="text-link">فتح موسوعة نقادة <ActionIcon name="arrow" className="inline-arrow" /></Link></div>
          <div className={knowledgeStyles.attribution}>
            <div className={knowledgeStyles.seal}>أد</div>
            <div><h2>بمساهمة الأستاذ أحمد الدعباسي</h2><p>مؤلف «{primaryKnowledgeContributor.primaryWork}» · {primaryKnowledgeContributor.role}. تجد إسناد كل مادة ومصدرها في صفحتها. <Link href={`/contributors/${primaryKnowledgeContributor.slug}`}>عرض ملف المساهم <ActionIcon name="arrow" className="inline-arrow" /></Link></p></div>
          </div>
          <div className={knowledgeStyles.grid}>
            <article className={knowledgeStyles.card}><span className={knowledgeStyles.cardBadge}>خريطة المكان</span><h2>{knowledgePlaces.length.toLocaleString('ar-EG')} موضعًا</h2><p>{knowledgePlaces.slice(0, 6).map((item) => item.shortName || item.name).join('، ')}…</p><Link href="/knowledge/places">استكشف الأماكن <ActionIcon name="arrow" className="inline-arrow" /></Link></article>
            <article className={knowledgeStyles.card}><span className={knowledgeStyles.cardBadge}>أعلام نقادة</span><h2>{knowledgePeople.length.toLocaleString('ar-EG')} شخصية</h2><p>{knowledgePeople.slice(0, 4).map((item) => item.name).join('، ')}.</p><Link href="/knowledge/people">استكشف الأعلام <ActionIcon name="arrow" className="inline-arrow" /></Link></article>
            <article className={knowledgeStyles.card}><span className={knowledgeStyles.cardBadge}>التراث والمعالم</span><h2>{knowledgeHeritage.length.toLocaleString('ar-EG')} موضوعًا</h2><p>{knowledgeHeritage.slice(0, 4).map((item) => item.name).join('، ')}.</p><Link href="/knowledge/heritage">استكشف التراث <ActionIcon name="arrow" className="inline-arrow" /></Link></article>
            <article className={knowledgeStyles.card}><span className={knowledgeStyles.cardBadge}>المراجع</span><h2>{knowledgeReferences.length.toLocaleString('ar-EG')} مرجعًا</h2><p>فهرس مرجعي مستقل يوضح طبقة المصادر التي استند إليها المؤلف في المادة المنشورة.</p><Link href="/knowledge/references">عرض المراجع <ActionIcon name="arrow" className="inline-arrow" /></Link></article>
            <article className={knowledgeStyles.card}><span className={knowledgeStyles.cardBadge}>العمل الميداني</span><h2>{fieldInformants.length.toLocaleString('ar-EG')} اسمًا</h2><p>مقابلات ومساعدات ميدانية وردت في المصدر، مع نطاقاتها الجغرافية دون نشر بيانات اتصال.</p><Link href="/knowledge/fieldwork">عرض العمل الميداني <ActionIcon name="arrow" className="inline-arrow" /></Link></article>
            <article className={knowledgeStyles.card}><span className={knowledgeStyles.cardBadge}>منهج الإسناد</span><h2>المصدر ظاهر</h2><p>أي معلومة مأخوذة من مواد الأستاذ أحمد تحمل إسنادًا له وللمصدر، مع توضيح سنة البيانات التاريخية متى كانت متاحة.</p><Link href={`/contributors/${primaryKnowledgeContributor.slug}`}>عن المساهم والمصادر <ActionIcon name="arrow" className="inline-arrow" /></Link></article>
          </div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow eyebrow--dark">أنشطة يبحث عنها أهل نقادة</span><h2>خدمات تهمّك في نقادة</h2><p>صيدليات وأطباء ومدارس ومطاعم ومحلات في نقادة. تصفّح الأسماء والعناوين ووسائل التواصل.</p></div><Link href="/activities" className="text-link">كل أنواع الأنشطة <ActionIcon name="arrow" className="inline-arrow" /></Link></div>
          <div className="category-grid">{featuredActivities.map((activity, index) => {
            const count = getBusinessesForActivity(activity).length;
            return <Link key={activity.slug} href={`/activities/${activity.slug}`} className="category-card"><CategoryCover category={activity.visualCategory} index={index} /><h3>{activity.name}</h3><p>{activity.description}</p><div className="category-card__footer"><b>{count.toLocaleString('ar-EG')} اسمًا</b><span>عرض النتائج <ActionIcon name="arrow" className="inline-arrow" /></span></div></Link>;
          })}</div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="shell"><div className="section-heading"><div><span className="eyebrow eyebrow--dark">بيانات مرتبطة بالخرائط</span><h2>أماكن لها مرجع وصول مباشر</h2><p>استعرض العنوان والتقييم، وافتح الخريطة للوصول إلى المكان.</p></div><Link href="/directory" className="text-link">كل النتائج <ActionIcon name="arrow" className="inline-arrow" /></Link></div>
          <div className="listing-grid">{featuredBusinesses.map((item) => <ListingCard key={item.id} listing={item} compact />)}</div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading"><div><span className="eyebrow eyebrow--dark">الدليل يتجدد</span><h2>سجلات تمت مراجعتها مؤخرًا</h2><p>تعرّف إلى أحدث الأنشطة التي راجعنا بياناتها.</p></div><Link href="/updates" className="text-link">كل التحديثات <ActionIcon name="arrow" className="inline-arrow" /></Link></div>
        <div className="listing-grid">{recentlyReviewed.map((item) => <ListingCard key={item.id} listing={item} compact />)}</div>
      </section>

      <section className="section shell place-feature">
        <div className="place-feature__intro"><span className="eyebrow eyebrow--dark">قرى نقادة ونجوعها</span><h2>ابدأ من قريتك</h2><p>من بشلاو والأوسط قمولا إلى طوخ والخطارة ودنفيق؛ اعرف المكان وتصفّح خدماته.</p><Link href="/villages" className="button button--primary">كل أدلة القرى والنجوع</Link></div>
        <div className="place-list">{featuredLocalityGuides.map((item, index) => <Link key={item.slug} href={`/villages/${item.slug}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>دليل {item.name}</strong><small>{item.type}</small></div><b>{item.businessCount.toLocaleString('ar-EG')} سجلًا</b></Link>)}</div>
      </section>

      <section className={blogStyles.previewSection}>
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow eyebrow--dark">مدونة دليل نقادة</span><h2>حكايات ومعرفة من نقادة</h2><p>اقرأ عن تاريخ نقادة، وحياة أهلها، والأماكن التي تصنع ذاكرتها.</p></div><Link href="/blog" className="text-link">كل مقالات المدونة <ActionIcon name="arrow" className="inline-arrow" /></Link></div>
          <div className={blogStyles.previewGrid}>
            {featuredArticles.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`} className={blogStyles.previewCard}>
                <span>{article.category} · {article.locality}</span>
                <h3>{article.title}</h3>
                <p>{article.description}</p>
                <b>بقلم {villageArticleAuthor.name} · اقرأ المقال <ActionIcon name="arrow" className="inline-arrow" /></b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section memory-section">
        <div className="shell"><div className="section-heading section-heading--light"><div><span className="eyebrow">ذاكرة المكان</span><h2>العائلات والأعلام والمعالم بمصادرها</h2><p>مساحة توثيقية منفصلة عن دليل الخدمات، تحافظ على حدود كل معلومة.</p></div><Link href="/heritage" className="text-link text-link--light">استكشف السجل التراثي <ActionIcon name="arrow" className="inline-arrow" /></Link></div>
          <div className="memory-grid">
            <Link href="/families" className="memory-card"><span>السجل العائلي</span><strong>{families.length.toLocaleString('ar-EG')}</strong><h3>عائلة وفرعًا تاريخيًا</h3><p>الموضع ودرجة الدليل والتنبيه اللازم، من غير وصل أنساب بالتشابه.</p></Link>
            <Link href="/landmarks" className="memory-card memory-card--landmarks"><span>معالم نقادة بالصور</span><strong>{landmarks.length.toLocaleString('ar-EG')}</strong><h3>معلمًا في السجل</h3><p>جولة بصرية في أشهر المواقع والعمارة وذاكرة نقادة الأثرية.</p></Link>
            <Link href="/heritage" className="memory-card"><span>أعلام المكان</span><strong>{people.length.toLocaleString('ar-EG')}</strong><h3>شخصيات في السجل</h3><p>{people.slice(0, 3).map((item) => item.name).join('، ')}.</p></Link>
          </div>
        </div>
      </section>

      <section className="section shell"><div className="emergency-strip"><CategoryVisual category="emergency" size="lg" /><div><span className="eyebrow">اتصال سريع</span><h2>أرقام الطوارئ والخدمات المهمة</h2><p>أرقام الجهات الرسمية المختصرة للحالات العاجلة.</p></div><div className="emergency-strip__numbers"><a href="tel:123"><span>الإسعاف</span><strong>123</strong></a><a href="tel:122"><span>النجدة</span><strong>122</strong></a><a href="tel:180"><span>المطافئ</span><strong>180</strong></a></div><Link href="/emergency" className="button button--light">كل الأرقام</Link></div></section>

      <section className="section section--muted"><div className="shell methodology"><div><span className="eyebrow eyebrow--dark">منهجية البيانات</span><h2>الدقة قبل العدد</h2><p>كل نوع من البيانات له معيار نشر واضح، وتظهر حدود المعلومة بدل إخفائها.</p><Link href="/about" className="text-link">اقرأ منهج الدليل <ActionIcon name="arrow" className="inline-arrow" /></Link></div><div className="methodology__grid"><article><b>01</b><h3>خدمات قابلة للوصول</h3><p>العنوان والهاتف والخريطة تُعرض بحسب المصدر المتاح وتاريخ آخر مراجعة.</p></article><article><b>02</b><h3>جغرافيا بلا تخمين</h3><p>لا نُنشئ قرية أو تبعية مكانية من تشابه الاسم، بل من سجل منشور.</p></article><article><b>03</b><h3>عائلات بحدود واضحة</h3><p>تشابه اللقب لا يثبت نسبًا، وكل سجل يعرض درجته وتنبيهه الخاص.</p></article></div></div></section>

      <SiteReviews />
      <section className="section shell faq-section"><div className="section-heading"><div><span className="eyebrow eyebrow--dark">أسئلة شائعة</span><h2>قبل أن تبدأ البحث</h2></div></div><div className="faq-grid">{faq.map((item) => <details key={item.question}><summary>{item.question}<ActionIcon name="chevron" /></summary><p>{item.answer}</p></details>)}</div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}
