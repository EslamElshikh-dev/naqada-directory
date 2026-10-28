'use client';

import Link from 'next/link';

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="shell" style={{ paddingBlock: '64px', minHeight: '45vh' }}>
    <section role="alert" style={{ maxWidth: 640, marginInline: 'auto', textAlign: 'center' }}>
      <h1>تعذّر تحميل الصفحة دلوقت.</h1>
      <p>جرّب مرة تانية بعد قليل، أو ارجع للرئيسية وكمل لفّتك في الدليل.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <button type="button" className="button" onClick={reset}>حاول مرة تانية</button>
        <Link prefetch={false} href="/" className="button">الرجوع للرئيسية</Link>
      </div>
    </section>
  </main>;
}
