export function localTlsBrowserArgs(base) {
  const spki = process.env.QA_LOCAL_TLS_SPKI;
  if (!spki) return [];
  const url = new URL(base);
  if (url.protocol !== 'https:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || !/^[A-Za-z0-9+/]{43}=$/.test(spki)) {
    throw Error('The temporary QA certificate is restricted to HTTPS loopback tests');
  }
  return ['--ignore-certificate-errors-spki-list=' + spki];
}

export function verifyPerformanceTransport(lhr) {
  if (!process.env.QA_LOCAL_TLS_SPKI) return;
  const document = lhr.audits['network-requests'].details.items.find(item => item.resourceType === 'Document');
  if (document?.protocol !== 'h2') throw Error('The local performance run did not negotiate HTTP/2');
}
