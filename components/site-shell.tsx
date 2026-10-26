import Link from 'next/link';
import Image from 'next/image';
import { AccountButton } from './auth/account-button';
import { HeaderNav } from './header-nav';
import { ActionIcon } from './action-icon';
import { GlobalSearch } from './global-search';
import { HeaderNotifications } from './header-notifications';
import headerStyles from './site-header.module.css';
import brandStyles from './brand-mark.module.css';

export function BrandMark({ compact = false, priority = false }: { compact?: boolean; priority?: boolean }) {
  const size = compact ? 30 : 42;
  return (
    <span className={`brand-mark ${brandStyles.mark}${compact ? ` ${brandStyles.compact}` : ''}`} aria-hidden="true">
      <Image src="/icon.svg" width={size} height={size} alt="" loading={priority ? 'eager' : 'lazy'} />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className={headerStyles.header}>
      <div className={`shell ${headerStyles.inner}`}>
        <Link prefetch={false} href="/" className={headerStyles.brand} aria-label="دليل نقادة — الرئيسية">
          <span className={headerStyles.emblem}><BrandMark priority /></span>
          <span className={headerStyles.brandCopy}>
            <small><i aria-hidden="true" /> من أهل البلد</small>
            <strong>دليل نقادة</strong>
          </span>
          <span className={headerStyles.scope}>قنا</span>
        </Link>
        <HeaderNav />
        <div className={headerStyles.actions}>
          <GlobalSearch />
          <HeaderNotifications />
          <AccountButton />
          <Link prefetch={false} href="/emergency" className={headerStyles.emergency} aria-label="أرقام الطوارئ والخدمات المهمة">
            <span className={headerStyles.emergencyDot} aria-hidden="true" />
            <span>أرقام مهمة</span>
          </Link>
          <Link prefetch={false} href="/directory" className={headerStyles.explore}><span>استكشف الدليل</span><ActionIcon name="arrow" /></Link>
        </div>
      </div>
    </header>
  );
}
