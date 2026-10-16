import { lazy, Suspense, useEffect } from 'react';
import { TestModeLabel } from './components/TestModeLabel';
import { useRoute } from './hooks/useRoute';
import type { Route } from './lib/router';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlayerPage } from './pages/PlayerPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RestorePage } from './pages/RestorePage';
import { SciencePage } from './pages/SciencePage';
import { UnlockPage } from './pages/UnlockPage';

const SITE_TITLE = 'Focus';

// The audio test page is for development only. It is left out of the production build.
const BenchPage = import.meta.env.DEV
  ? lazy(() => import('./pages/BenchPage').then((module) => ({ default: module.BenchPage })))
  : null;

const PAGE_TITLES: Record<Exclude<Route['name'], 'player'>, string> = {
  unlock: 'Lifetime unlock',
  restore: 'Restore purchase',
  science: 'The science',
  privacy: 'Privacy',
  bench: 'Audio test page',
  notFound: 'Page not found',
};

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'player':
      return <PlayerPage />;
    case 'bench':
      if (BenchPage) {
        return (
          <Suspense fallback={null}>
            <BenchPage />
          </Suspense>
        );
      }
      return <NotFoundPage />;
    case 'unlock':
      return <UnlockPage sessionId={route.sessionId} />;
    case 'restore':
      return <RestorePage />;
    case 'science':
      return <SciencePage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'notFound':
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = route.name === 'player' ? SITE_TITLE : `${PAGE_TITLES[route.name]} | ${SITE_TITLE}`;
  }, [route]);

  return (
    <>
      <TestModeLabel />
      <Page route={route} />
    </>
  );
}
