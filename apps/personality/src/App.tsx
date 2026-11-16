import { useEffect } from 'react';
import { TestModeLabel } from './components/TestModeLabel.tsx';
import { useRoute } from './hooks/useRoute.ts';
import type { Route } from './lib/router.ts';
import { Link } from './components/Link.tsx';
import { ComparePage } from './pages/ComparePage.tsx';
import { InfoPage } from './pages/InfoPage.tsx';
import { IntroPage } from './pages/IntroPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { ReportPage } from './pages/ReportPage.tsx';
import { ResultPage } from './pages/ResultPage.tsx';
import { RestorePage } from './pages/RestorePage.tsx';
import { UnlockPage } from './pages/UnlockPage.tsx';
import { TestPage } from './pages/TestPage.tsx';
import { PAGES } from './seo.ts';

const SITE_TITLE = 'Personality test';

function pageTitle(route: Route): string {
  switch (route.name) {
    // Pages that search engines see keep the title from src/seo.ts, the same as in the HTML the server sent.
    case 'intro':
      return PAGES[route.kind === 'big-five' ? 'bigFive' : 'intro'].title;
    case 'science':
    case 'privacy':
      return PAGES[route.name].title;
    case 'test':
      return `Questions | ${route.kind === 'big-five' ? 'Big Five test' : SITE_TITLE}`;
    case 'result':
      return `Your result | ${SITE_TITLE}`;
    case 'report':
      return `Full report | ${SITE_TITLE}`;
    case 'compare':
      return `Comparison | ${SITE_TITLE}`;
    case 'unlock':
      return `Lifetime unlock | ${SITE_TITLE}`;
    case 'restore':
      return `Enter your code | ${SITE_TITLE}`;
    case 'notFound':
      return `Page not found | ${SITE_TITLE}`;
  }
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'intro':
      return <IntroPage key={route.kind} kind={route.kind} withId={route.withId} />;
    case 'test':
      return <TestPage key={route.kind} kind={route.kind} />;
    case 'result':
      return <ResultPage key={route.id} id={route.id} />;
    case 'report':
      return <ReportPage key={route.id} id={route.id} />;
    case 'compare':
      return <ComparePage key={`${route.a}/${route.b}`} a={route.a} b={route.b} />;
    case 'science':
    case 'privacy':
      return <InfoPage page={route.name} />;
    case 'unlock':
      return <UnlockPage sessionId={route.sessionId} back={route.back} />;
    case 'restore':
      return <RestorePage back={route.back} />;
    case 'notFound':
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = pageTitle(route);
  }, [route]);

  return (
    <>
      <TestModeLabel />
      <Page route={route} />
      <footer className="site-footer">
        <nav className="site-footer-nav" aria-label="About this test">
          <Link to="science" className="site-footer-link">
            The science
          </Link>{' '}
          <Link to="privacy" className="site-footer-link">
            Privacy
          </Link>{' '}
          <Link to="big-five/" className="site-footer-link">
            Big Five test
          </Link>{' '}
          <Link to="unlock" className="site-footer-link">
            Unlock
          </Link>{' '}
          <Link to="restore" className="site-footer-link">
            Enter a code
          </Link>
        </nav>
        <p className="site-footer-trademark">
          Not affiliated with The Myers-Briggs Company. Myers-Briggs and MBTI are trademarks of The
          Myers-Briggs Company.
        </p>
      </footer>
    </>
  );
}
