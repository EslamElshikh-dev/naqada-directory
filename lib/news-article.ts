// Only used as source material for an original factual brief. Publisher prose is never stored.
const ARTICLE_CONTENT = /\b(?:article[-_ ]?(?:body|content|details)|articleBody|ArticleDetails|story[-_ ]?body|entry[-_ ]?content|post[-_ ]?content|news[-_ ]?(?:body|content)|details[-_ ]?body)\b/i;
const TAGS = /<(script|style|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG = /<[^>]+>/g;

function plainText(value: string) {
  const named: Record<string, string> = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–' };
  return value.replace(TAGS, ' ').replace(HTML_TAG, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith('#')) {
        const point = Number.parseInt(code.slice(code[1]?.toLowerCase() === 'x' ? 2 : 1), code[1]?.toLowerCase() === 'x' ? 16 : 10);
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
      }
      return named[code.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, ' ').trim();
}

function fromStructuredData(html: string): string[] {
  for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(script[1]);
      const entries: unknown[] = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const article = entry as { articleBody?: unknown; '@graph'?: Array<{ articleBody?: unknown }> };
        const body = article.articleBody || article['@graph']?.find(node => typeof node.articleBody === 'string')?.articleBody;
        if (typeof body === 'string' && body.length >= 400) return body.split(/\n\s*\n|(?<=[.!؟])\s+(?=[\p{Script=Arabic}])/u).map(plainText);
      }
    } catch { /* Malformed JSON-LD must not break the story page. */ }
  }
  return [];
}

function matchingElement(html: string, start: number, tag: string) {
  const tags = new RegExp(`<\/?${tag}\\b[^>]*>`, 'gi');
  tags.lastIndex = start;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
  }
  return html.slice(start, start + 120_000);
}

function articleRegion(html: string) {
  const elements = /<(article|section|div)\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  let genericArticle: { start: number; tag: string } | null = null;
  while ((match = elements.exec(html))) {
    if (!genericArticle && match[1].toLowerCase() === 'article') genericArticle = { start: elements.lastIndex, tag: 'article' };
    if (ARTICLE_CONTENT.test(match[0])) return matchingElement(html, elements.lastIndex, match[1]);
  }
  return genericArticle ? matchingElement(html, genericArticle.start, genericArticle.tag) : '';
}

export function extractPublisherArticle(html: string): string {
  const structured = fromStructuredData(html);
  const region = articleRegion(html);
  const paragraphs = structured.length ? structured : [...region.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => plainText(match[1]));
  const seen = new Set<string>();
  const content = paragraphs.filter(paragraph => {
    if (paragraph.length < 65 || paragraph.length > 1700 || /^(اقرأ (أيضًا|ايضا)|تابعنا|شارك الخبر|شاهد أيضًا|إعلان|المزيد من)/.test(paragraph)) return false;
    if (seen.has(paragraph)) return false;
    seen.add(paragraph);
    return true;
  }).slice(0, 18).join('\n\n');
  return content.length >= 340 ? content.slice(0, 10500) : '';
}

export function isOriginalBrief(brief: string, article: string, oldDescription: string) {
  if (brief.length < Math.max(230, oldDescription.length + 80) || brief.length > 2200) return false;
  if (!/[\u0600-\u06ff]/u.test(brief) || /^(لا (أستطيع|يمكنني)|بالتأكيد|إليك)/.test(brief)) return false;
  // Reject long verbatim passages while allowing incidental overlap in names and facts.
  const normalizedArticle = plainText(article).replace(/[،؛.!؟:]/g, ' ');
  const words = plainText(brief).replace(/[،؛.!؟:]/g, ' ').split(' ');
  for (let index = 0; index + 23 < words.length; index += 1) {
    if (normalizedArticle.includes(words.slice(index, index + 24).join(' '))) return false;
  }
  return true;
}
