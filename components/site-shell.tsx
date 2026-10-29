import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { AccountButton } from './auth/account-button';
import { HeaderNav } from './header-nav';
import { ActionIcon } from './action-icon';
import { DeferredGlobalSearch as GlobalSearch } from './deferred-global-search';
import { DeferredNotifications as HeaderNotifications } from './widget-placeholders';
import headerStyles from './site-header.module.css';

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
