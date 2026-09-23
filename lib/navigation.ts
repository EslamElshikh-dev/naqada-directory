/** The same route families drive both desktop and mobile navigation. */
export function isNavigationActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (href === '/') return path === '/';
  const roots: Record<string, string[]> = {
    '/directory': ['/directory', '/activities', '/category', '/listing', '/search'],
    '/villages': ['/villages', '/coverage'],
    '/knowledge': ['/knowledge', '/heritage', '/people', '/landmarks', '/contributors'],
  };
  return (roots[href] || [href]).some((root) => path === root || path.startsWith(`${root}/`));
}
