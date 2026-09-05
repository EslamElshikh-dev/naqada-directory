import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { CategoryVisual } from '@/components/category-visual';
import { ListingCard } from '@/components/listing-card';
import { businesses, categories, families, featuredBusinesses, landmarks, localities, meta, officialLocalities, people } from '@/lib/data';
import { siteConfig } from '@/lib/site';
import { getVillageArticle, villageArticleAuthor, villageArticles } from '@/lib/village-articles';
import { SiteReviews } from '@/components/site-reviews';
import { ActionIcon } from '@/components/action-icon';
import blogStyles from './blog/blog.module.css';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const quickCategories = ['الطب والصحة', 'التجزئة والتسوق', 'التعليم', 'المطاعم والأطعمة'];
const faq = [
  { question: 'ما الذي يقدمه دليل نقادة؟', answer: 'ينظم الأنشطة والخدمات والقرى والنجوع والسجل العائلي والتراثي لمركز نقادة في صفحات واضحة وسهلة البحث.' },
  { question: 'هل ظهور النشاط يعني أنه معتمد رسميًا؟', answer: 'لا. الدليل منصة معلوماتية مستقلة، ويعرض مصدر البيانات وتاريخ المراجعة بقدر ما تسمح به المادة المتاحة.' },
  { question: 'كيف تُعرض معلومات العائلات؟', answer: 'لا تُنشر إلا الحالات التي اجتازت معيار النشر، ولا يُستنتج نسب أو ارتباط من تشابه الأسماء.' },
  { question: 'هل تشمل التغطية كل قرى نقادة؟', answer: 'الهيكل الجغرافي يشمل المواضع الموثقة، بينما يزداد عدد الأنشطة والتفاصيل تدريجيًا مع اكتمال المراجعة.' },
];

function articleHref(localityName: string) {
  const locality = localities.find((item) => getVillageArticle(item.name)?.locality === localityName);
  return locality ? `/villages/${locality.slug}` : '/blog';
}

export default function HomePage() {
  const topLocalities = officialLocalities.filter((item) => item.businessCount > 0).slice(0, 12);
  const recentlyReviewed = [...businesses]
    .filter((item) => Boolean(item.checked))
    .sort((a, b) => (b.checked || '').localeCompare(a.checked || '') || (b.reviews || 0) - (a.reviews || 0))
    .slice(0, 6);
  const featuredArticles = villageArticles.slice(0, 4);
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل وموسوعة مركز نقادة',
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    dateModified: meta.updatedAt,
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر', address: { '@type': 'PostalAddress', addressRegion: 'قنا', addressCountry: 'EG' } },
  };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) };

  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero__mesh" aria-hidden="true" />
        <div className="shell hero__grid">
          <div className="hero__content">
            <div className="hero__meta-line"><span className="live-badge"><i /> بيانات محلية منظّمة</span><span>مركز نقادة · محافظة قنا</span></div>
            <span className="eyebrow">الدليل والموسوعة المحلية لمركز نقادة وقراه</span>
            <h1>كل ما يخص نقادة… <em>خدماتك ومكانك</em> في بحث واحد.</h1>
            <p>ابحث عن الأطباء والمحلات والمدارس والمطاعم والخدمات، واستكشف القرى والنجوع والعائلات والأعلام والمعالم في تجربة محلية واحدة.</p>
            <form action="/directory" className="hero-search">
              <span className="hero-search__brand"><BrandMark compact /></span>
              <label className="sr-only" htmlFor="home-search">ابحث في دليل نقادة</label>
              <input id="home-search" name="q" placeholder="ابحث باسم خدمة أو نشاط أو قرية…" />
              <button type="submit">ابحث في الدليل <b aria-hidden="true">←</b></button>
            </form>
            <div className="hero__quick-links"><span>وصول سريع</span>{quickCategories.map((name) => { const category = categories.find((item) => item.name === name); return category ? <Link key={category.slug} href={`/directory/${category.slug}`}>{category.shortLabel}</Link> : null; })}<Link href="/villages">القرى</Link><Link href="/blog">المدونة</Link></div>
            <div className="hero__trust">
              <span><b>{meta.businessCount.toLocaleString('ar-EG')}</b><small>نشاطًا وخدمة</small></span>
              <span><b>{meta.localityCount.toLocaleString('ar-EG')}</b><small>قرية ونجعًا وموضعًا</small></span>
              <span><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString('ar-EG')}</b><small>علمًا ومعلمًا</small></span>
            </div>
          </div>
          <aside className="hero__panel" aria-label="نطاق التغطية">
            <div className="hero__panel-brand"><BrandMark /><i /></div>
            <div className="hero__panel-head"><div><span>نطاق التغطية</span><strong>من قلب مركز نقادة</strong></div><span className="panel-status"><i /> محلي</span></div>
            <div className="hero__panel-stat"><strong>{meta.businessCount.toLocaleString('ar-EG')}</strong><div><b>مكان وخدمة</b><span>منظّمان داخل دليل واحد</span></div></div>
            <span className="hero__panel-label">استكشف حسب المكان</span>
            <div className="village-cloud">{topLocalities.map((item) => <Link key={item.slug} href={`/villages/${item.slug}`}>{item.name}</Link>)}</div>
            <Link href="/villages" className="text-link text-link--light">كل القرى والنجوع ←</Link>
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
          <span><small>حسب موقعك</small><strong>القرى والنجوع</strong></span>
          <b>{meta.localityCount.toLocaleString('ar-EG')}</b>
        </Link>
        <Link href="/landmarks" className="home-action">
          <span className="home-action__icon"><ActionIcon name="landmark" /></span>
          <span><small>اكتشف المكان</small><strong>معالم نقادة</strong></span>
          <i aria-hidden="true">←</i>
        </Link>
        <Link href="/contribute" className="home-action home-action--contribute">
          <span className="home-action__icon"><ActionIcon name="add" /></span>
          <span><small>شارك في الدليل</small><strong>أضف نشاطًا</strong></span>
          <i aria-hidden="true">+</i>
        </Link>
      </nav>

      <section className="shell discovery-strip" aria-label="طريقة استخدام الدليل">
        <div className="discovery-strip__intro"><span>وصول أسرع</span><strong>من البحث إلى المكان في خطوات واضحة</strong></div>
        <ol>
          <li><b>01</b><div><strong>اكتب ما تحتاجه</strong><span>اسم نشاط، خدمة، قرية أو نجع</span></div></li>
          <li><b>02</b><div><strong>قارن البيانات</strong><span>العنوان والتقييم ومرجع الخريطة</span></div></li>
          <li><b>03</b><div><strong>تواصل أو تحرّك</strong><span>اتصال مباشر ومسار وصول سريع</span></div></li>
        </ol>
      </section>

      <section className="section shell">
        <div className="section-heading"><div><span className="eyebrow eyebrow--dark">أقسام الدليل</span><h2>ابدأ بنوع الخدمة التي تحتاجها</h2><p>كل قسم يفتح صفحة مستقلة قابلة للبحث والتصفية.</p></div><Link href="/directory" className="text-link">عرض الدليل بالكامل ←</Link></div>
        <div className="category-grid">{categories.slice(0, 12).map((category, index) => (
          <Link key={category.slug} href={`/directory/${category.slug}`} className="category-card">
            <div className="category-card__visual"><CategoryVisual category={category.name} /><span>{String(index + 1).padStart(2, '0')}</span></div>
            <h3>{category.shortLabel}</h3><p>{category.description}</p>
            <div className="category-card__footer"><b>{category.count.toLocaleString('ar-EG')} نتيجة</b><span>استكشف ←</span></div>
          </Link>
        ))}</div>
      </section>

      <section className="section section--muted">
        <div className="shell"><div className="section-heading"><div><span className="eyebrow eyebrow--dark">بيانات مرتبطة بالخرائط</span><h2>أماكن لها مرجع وصول مباشر</h2><p>سجلات مختارة حسب وضوح البيانات وحضور المراجعات لدى المصدر.</p></div><Link href="/directory" className="text-link">كل النتائج ←</Link></div>
          <div className="listing-grid">{featuredBusinesses.map((item) => <ListingCard key={item.id} listing={item} compact />)}</div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading"><div><span className="eyebrow eyebrow--dark">الدليل يتجدد</span><h2>سجلات تمت مراجعتها مؤخرًا</h2><p>تحديثات حقيقية من قاعدة الدليل مع صفحات مستقلة وتاريخ مراجعة واضح.</p></div><Link href="/updates" className="text-link">كل التحديثات ←</Link></div>
        <div className="listing-grid">{recentlyReviewed.map((item) => <ListingCard key={item.id} listing={item} compact />)}</div>
      </section>

      <section className={blogStyles.previewSection}>
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow eyebrow--dark">مدونة دليل نقادة</span><h2>حكايات القرى والنجوع… بالمعلومة والضحكة في وقتها</h2><p>مقالات محلية أصلية عن المكان والناس والتاريخ والخدمات، بقلم إسلام الشيخ.</p></div><Link href="/blog" className="text-link">كل مقالات المدونة ←</Link></div>
          <div className={blogStyles.previewGrid}>
            {featuredArticles.map((article) => (
              <Link key={article.locality} href={articleHref(article.locality)} className={blogStyles.previewCard}>
                <span>{article.locality}</span>
                <h3>{article.title}</h3>
                <p>{article.description}</p>
                <b>بقلم {villageArticleAuthor.name} · اقرأ المقال ←</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell place-feature">
        <div className="place-feature__intro"><span className="eyebrow eyebrow--dark">الجغرافيا المحلية</span><h2>لكل موضع صفحة مستقلة</h2><p>استكشف الأنشطة المنشورة داخل المدينة والقرى والنجوع، واعرف نوع الموضع ومصدر إدراجه.</p><Link href="/villages" className="button button--primary">تصفح كل المواضع</Link></div>
        <div className="place-list">{topLocalities.slice(0, 8).map((item, index) => <Link key={item.slug} href={`/villages/${item.slug}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.name}</strong><small>{item.type}</small></div><b>{item.businessCount.toLocaleString('ar-EG')} سجلًا</b></Link>)}</div>
      </section>

      <section className="section memory-section">
        <div className="shell"><div className="section-heading section-heading--light"><div><span className="eyebrow">ذاكرة المكان</span><h2>العائلات والأعلام والمعالم بمصادرها</h2><p>مساحة توثيقية منفصلة عن دليل الخدمات، تحافظ على حدود كل معلومة.</p></div><Link href="/heritage" className="text-link text-link--light">استكشف السجل التراثي ←</Link></div>
          <div className="memory-grid">
            <Link href="/families" className="memory-card"><span>السجل العائلي</span><strong>{families.length.toLocaleString('ar-EG')}</strong><h3>عائلة وفرعًا تاريخيًا</h3><p>الموضع ودرجة الدليل والتنبيه اللازم، من غير وصل أنساب بالتشابه.</p></Link>
            <Link href="/landmarks" className="memory-card memory-card--landmarks"><span>معالم نقادة بالصور</span><strong>{landmarks.length.toLocaleString('ar-EG')}</strong><h3>معلمًا في السجل</h3><p>جولة بصرية في أشهر المواقع والعمارة وذاكرة نقادة الأثرية.</p></Link>
            <Link href="/heritage" className="memory-card"><span>أعلام المكان</span><strong>{people.length.toLocaleString('ar-EG')}</strong><h3>شخصيات في السجل</h3><p>{people.slice(0, 3).map((item) => item.name).join('، ')}.</p></Link>
          </div>
        </div>
      </section>

      <section className="section shell"><div className="emergency-strip"><CategoryVisual category="emergency" size="lg" /><div><span className="eyebrow">اتصال سريع</span><h2>أرقام الطوارئ والخدمات المهمة</h2><p>أرقام الجهات الرسمية المختصرة للحالات العاجلة.</p></div><div className="emergency-strip__numbers"><a href="tel:123"><span>الإسعاف</span><strong>123</strong></a><a href="tel:122"><span>النجدة</span><strong>122</strong></a><a href="tel:180"><span>المطافئ</span><strong>180</strong></a></div><Link href="/emergency" className="button button--light">كل الأرقام</Link></div></section>

      <section className="section section--muted"><div className="shell methodology"><div><span className="eyebrow eyebrow--dark">منهجية البيانات</span><h2>الدقة قبل العدد</h2><p>كل نوع من البيانات له معيار نشر واضح، وتظهر حدود المعلومة بدل إخفائها.</p><Link href="/about" className="text-link">اقرأ منهج الدليل ←</Link></div><div className="methodology__grid"><article><b>01</b><h3>خدمات قابلة للوصول</h3><p>العنوان والهاتف والخريطة تُعرض بحسب المصدر المتاح وتاريخ آخر مراجعة.</p></article><article><b>02</b><h3>جغرافيا بلا تخمين</h3><p>لا نُنشئ قرية أو تبعية مكانية من تشابه الاسم، بل من سجل منشور.</p></article><article><b>03</b><h3>عائلات بحدود واضحة</h3><p>تشابه اللقب لا يثبت نسبًا، وكل سجل يعرض درجته وتنبيهه الخاص.</p></article></div></div></section>

      <SiteReviews />
      <section className="section shell faq-section"><div className="section-heading"><div><span className="eyebrow eyebrow--dark">أسئلة شائعة</span><h2>قبل أن تبدأ البحث</h2></div></div><div className="faq-grid">{faq.map((item) => <details key={item.question}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}
