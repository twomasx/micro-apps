import { useEffect } from 'react';
import { useRoute } from './hooks/useRoute.ts';
import type { Route } from './lib/router.ts';
import { Link } from './components/Link.tsx';
import { ComparePage } from './pages/ComparePage.tsx';
import { InfoPage, infoTitle } from './pages/InfoPage.tsx';
import { IntroPage } from './pages/IntroPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { ReportPage } from './pages/ReportPage.tsx';
import { ResultPage } from './pages/ResultPage.tsx';
import { TestPage } from './pages/TestPage.tsx';

const SITE_TITLE = 'Personality test';

function pageTitle(route: Route): string {
  switch (route.name) {
    case 'intro':
      return SITE_TITLE;
    case 'test':
      return `Questions | ${SITE_TITLE}`;
    case 'result':
      return `Your result | ${SITE_TITLE}`;
    case 'report':
      return `Full report | ${SITE_TITLE}`;
    case 'compare':
      return `Comparison | ${SITE_TITLE}`;
    case 'science':
    case 'privacy':
      return `${infoTitle(route.name)} | ${SITE_TITLE}`;
    case 'notFound':
      return `Page not found | ${SITE_TITLE}`;
  }
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'intro':
      return <IntroPage withId={route.withId} />;
    case 'test':
      return <TestPage />;
    case 'result':
      return <ResultPage key={route.id} id={route.id} />;
    case 'report':
      return <ReportPage key={route.id} id={route.id} sessionId={route.sessionId} />;
    case 'compare':
      return (
        <ComparePage
          key={`${route.a}/${route.b}`}
          a={route.a}
          b={route.b}
          sessionId={route.sessionId}
        />
      );
    case 'science':
    case 'privacy':
      return <InfoPage page={route.name} />;
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
      <Page route={route} />
      <footer className="site-footer">
        <nav className="site-footer-nav" aria-label="About this test">
          <Link to="science" className="site-footer-link">
            The science
          </Link>{' '}
          <Link to="privacy" className="site-footer-link">
            Privacy
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
