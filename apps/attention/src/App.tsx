import { lazy, Suspense, useEffect } from 'react';
import { TestModeLabel } from './components/TestModeLabel';
import { useRoute } from './hooks/useRoute';
import type { Route } from './lib/router';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProgressPage } from './pages/ProgressPage';
import { RestorePage } from './pages/RestorePage';
import { SciencePage } from './pages/SciencePage';
import { SessionPage } from './pages/SessionPage';
import { TestPage } from './pages/TestPage';
import { UnlockPage } from './pages/UnlockPage';
import { TodayPage } from './pages/TodayPage';

const SITE_TITLE = 'Attention';

// The sound check page is for development only. It is left out of the production build.
const SoundsPage = import.meta.env.DEV
  ? lazy(() => import('./pages/SoundsPage').then((module) => ({ default: module.SoundsPage })))
  : null;

const PAGE_TITLES: Record<Exclude<Route['name'], 'today'>, string> = {
  session: 'Session',
  test: 'Attention test',
  progress: 'Progress',
  unlock: 'Lifetime unlock',
  restore: 'Restore purchase',
  science: 'The science',
  privacy: 'Privacy',
  sounds: 'Sound check',
  notFound: 'Page not found',
};

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <TodayPage />;
    case 'session':
      return <SessionPage />;
    case 'test':
      return <TestPage />;
    case 'progress':
      return <ProgressPage />;
    case 'science':
      return <SciencePage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'sounds':
      if (SoundsPage) {
        return (
          <Suspense fallback={null}>
            <SoundsPage />
          </Suspense>
        );
      }
      return <NotFoundPage />;
    case 'unlock':
      return <UnlockPage sessionId={route.sessionId} />;
    case 'restore':
      return <RestorePage />;
    case 'notFound':
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = route.name === 'today' ? SITE_TITLE : `${PAGE_TITLES[route.name]} | ${SITE_TITLE}`;
    // A link to a section (science#score) scrolls there once the page is drawn.
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [route]);

  return (
    <>
      <TestModeLabel />
      <Page route={route} />
    </>
  );
}
