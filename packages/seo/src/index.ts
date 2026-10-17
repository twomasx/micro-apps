/**
 * Search and share tags for every page we want found (SEO.md). Pure functions: no browser, no Node.
 * The build step in './build' writes them into the HTML the server sends.
 */

export interface Product {
  id: string;
  name: string;
  amount: number;
  currency: string;
}

export interface PageSeo {
  /** Path under the app's base, '' for the home page, otherwise ending in '/': 'science/'. */
  path: string;
  /** Under 60 characters, main phrase first. */
  title: string;
  /** Under 155 characters. */
  description: string;
  /** Share image, a path under the app's base, 1200x630. */
  image: string;
  imageAlt: string;
  /** 'website' for an app's pages, 'article' for content pages. */
  type?: 'website' | 'article';
  /** JSON-LD objects. */
  jsonLd?: readonly object[];
}

export interface Site {
  /** Production origin, like https://polymadlabs.com. Canonical links and share tags always use it. */
  origin: string;
  /** The app's base path, like '/breathwork/'. */
  base: string;
  siteName: string;
}

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function pageUrl(site: Site, path: string): string {
  return `${site.origin}${site.base}${path}`;
}

/** JSON for a <script type="application/ld+json">. `<` is escaped so text can never close the script. */
export function jsonLdScript(data: object): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/** Every head tag a page needs: title, description, canonical, Open Graph, Twitter card and JSON-LD. */
export function headTags(site: Site, page: PageSeo): string {
  const url = pageUrl(site, page.path);
  const image = pageUrl(site, page.image);
  return [
    `<title>${escape(page.title)}</title>`,
    `<meta name="description" content="${escape(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${page.type ?? 'website'}" />`,
    `<meta property="og:site_name" content="${escape(site.siteName)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escape(page.title)}" />`,
    `<meta property="og:description" content="${escape(page.description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escape(page.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(page.title)}" />`,
    `<meta name="twitter:description" content="${escape(page.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...(page.jsonLd ?? []).map(jsonLdScript),
  ].join('\n    ');
}

function price(amount: number): string {
  return (amount / 100).toFixed(2);
}

export interface WebApplicationInput {
  name: string;
  url: string;
  description: string;
  category: 'HealthApplication' | 'LifestyleApplication' | 'EducationalApplication';
  /** What the free tier is called, like "Free". */
  freeName: string;
  /** The paid unlocks, straight from config/products.json. */
  products: readonly Product[];
}

/** An app's home page. No ratings or reviews: we have none (SEO.md rule 2). */
export function webApplication(input: WebApplicationInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.name,
    url: input.url,
    description: input.description,
    applicationCategory: input.category,
    operatingSystem: 'Any (web browser)',
    isAccessibleForFree: true,
    offers: [
      { '@type': 'Offer', name: input.freeName, price: '0', priceCurrency: input.products[0]?.currency.toUpperCase() ?? 'USD' },
      ...input.products.map((product) => ({
        '@type': 'Offer',
        name: product.name,
        price: price(product.amount),
        priceCurrency: product.currency.toUpperCase(),
      })),
    ],
  };
}

export function website(origin: string, name: string): object {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name, url: `${origin}/` };
}

export function organization(origin: string, name: string, logo: string): object {
  return { '@context': 'https://schema.org', '@type': 'Organization', name, url: `${origin}/`, logo };
}

export interface ArticleInput {
  headline: string;
  description: string;
  url: string;
  image: string;
  /** ISO dates, like '2026-10-16'. */
  datePublished: string;
  dateModified: string;
  /** The publisher: name and home page. */
  publisher: { name: string; url: string; logo: string };
}

/** A content page (SEO.md step 2). The author is the organization: there is no named writer. */
export function article(input: ArticleInput): object {
  const publisher = {
    '@type': 'Organization',
    name: input.publisher.name,
    url: input.publisher.url,
    logo: { '@type': 'ImageObject', url: input.publisher.logo },
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    mainEntityOfPage: input.url,
    image: input.image,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: publisher,
    publisher,
  };
}

/** Where a page sits: [{ name: 'Breathwork', url }, { name: 'Box breathing', url }]. */
export function breadcrumbList(items: readonly { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })),
  };
}

/** A sitemap for one app or the landing page. */
export function sitemapXml(urls: readonly { loc: string; lastmod: string }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escape(url.loc)}</loc><lastmod>${url.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
}

/** Words that must never appear in a title, description or heading (SEO.md rules 1 and 3, app honest-claims rules). */
export const BANNED = [
  'mbti',
  'myers-briggs',
  '16personalities',
  'rewires your brain',
  'rewire your brain',
  'syncs your brainwaves',
  'clinically proven',
  'scientifically accurate',
  'boosts iq',
  'psychic powers',
  'cures',
  'quantum',
];

/** Everything wrong with a set of pages: lengths, repeated titles, banned words, the writing rules. Empty is good. */
export function seoProblems(pages: readonly Pick<PageSeo, 'path' | 'title' | 'description'>[]): string[] {
  const problems: string[] = [];
  const titles = new Map<string, string>();
  for (const page of pages) {
    const where = page.path || '(home)';
    if (page.title.length > TITLE_MAX) problems.push(`${where}: title is ${page.title.length} characters, over ${TITLE_MAX}`);
    if (page.description.length > DESCRIPTION_MAX) {
      problems.push(`${where}: description is ${page.description.length} characters, over ${DESCRIPTION_MAX}`);
    }
    const other = titles.get(page.title);
    if (other !== undefined) problems.push(`${where}: same title as ${other || '(home)'}`);
    titles.set(page.title, page.path);
    const text = `${page.title} ${page.description}`;
    for (const word of BANNED) if (text.toLowerCase().includes(word)) problems.push(`${where}: says "${word}"`);
    if (/[—–!]/.test(text)) problems.push(`${where}: has an em dash, en dash or exclamation mark`);
  }
  return problems;
}
