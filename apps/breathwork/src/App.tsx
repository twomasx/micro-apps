import { lazy, Suspense, useEffect } from 'react';
import { TestModeLabel } from './components/TestModeLabel';
import { useRoute } from './hooks/useRoute';
import type { Route } from './lib/router';
import { GUIDE_PAGES, PAGES } from './seo';
import { BreathePage } from './pages/BreathePage';
import { CustomPage } from './pages/CustomPage';
import { GuidePage } from './pages/GuidePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RestorePage } from './pages/RestorePage';
import { SciencePage } from './pages/SciencePage';
import { UnlockPage } from './pages/UnlockPage';
import { WeekPage } from './pages/WeekPage';

const SITE_TITLE = 'Breathwork';

// The engine test page is for development only. It is left out of the production build.
const BenchPage = import.meta.env.DEV
  ? lazy(() => import('./pages/BenchPage').then((module) => ({ default: module.BenchPage })))
  : null;

const PAGE_TITLES: Record<Exclude<Route['name'], 'breathe' | 'guide'>, string> = {
  week: 'Your week',
  custom: 'Custom patterns',
  unlock: 'Lifetime unlock',
  restore: 'Restore purchase',
  science: 'The science',
  privacy: 'Privacy',
  bench: 'Engine test',
  notFound: 'Page not found',
};

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'breathe':
      return <BreathePage />;
    case 'week':
      return <WeekPage />;
    case 'custom':
      return <CustomPage />;
    case 'unlock':
      return <UnlockPage sessionId={route.sessionId} />;
    case 'restore':
      return <RestorePage />;
    case 'science':
      return <SciencePage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'guide':
      return <GuidePage slug={route.slug} />;
    case 'bench':
      if (BenchPage) {
        return (
          <Suspense fallback={null}>
            <BenchPage />
          </Suspense>
        );
      }
      return <NotFoundPage />;
    case 'notFound':
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();

  useEffect(() => {
    // Pages that search engines see keep the title from src/seo.ts, the same as in the HTML the server sent.
    const seo =
      route.name === 'breathe' || route.name === 'science' || route.name === 'privacy'
        ? PAGES[route.name]
        : route.name === 'guide'
          ? GUIDE_PAGES[route.slug]
          : null;
    document.title = seo
      ? seo.title
      : `${PAGE_TITLES[route.name as Exclude<Route['name'], 'breathe' | 'guide'>] ?? 'Page not found'} | ${SITE_TITLE}`;
    // A link to a section (science#sigh) scrolls there itself.
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [route]);

  return (
    <>
      <TestModeLabel />
      <Page route={route} />
    </>
  );
}
