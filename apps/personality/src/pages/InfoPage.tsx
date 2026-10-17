import privacy from '../../content/privacy.md?raw';
import science from '../../content/science.md?raw';
import { Link } from '../components/Link.tsx';
import { Prose } from '../components/Prose.tsx';
import { parseContent } from '../lib/content.ts';

// These two files are free to read, so they ship with the app. The paid files do not.
const PAGES = { science: parseContent(science), privacy: parseContent(privacy) };

export type InfoPageName = keyof typeof PAGES;

export function InfoPage({ page }: { page: InfoPageName }) {
  const content = PAGES[page];
  return (
    <main className="info" data-page={page}>
      <h1 className="info-title">{content.title}</h1>
      {Object.entries(content.sections).map(([heading, body]) => (
        <section key={heading} className="info-section">
          <h2 className="info-section-title">{heading}</h2>
          <Prose body={body} />
        </section>
      ))}
      <p className="info-back">
        <Link to="" className="info-back-link">
          Go to the personality test
        </Link>
      </p>
    </main>
  );
}
