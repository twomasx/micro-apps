import { lazy, Suspense, useEffect } from 'react';
import { useRoute } from './hooks/useRoute';
import type { Route } from './lib/router';
import { BreathePage } from './pages/BreathePage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const SITE_TITLE = 'Breathwork';

// The engine test page is for development only. It is left out of the production build.
const BenchPage = import.meta.env.DEV
  ? lazy(() => import('./pages/BenchPage').then((module) => ({ default: module.BenchPage })))
  : null;

const PAGE_TITLES: Record<Exclude<Route['name'], 'breathe'>, string> = {
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
  if (route.name === 'breathe') return <BreathePage />;
  if (route.name === 'bench' && BenchPage) {
    return (
      <Suspense fallback={null}>
        <BenchPage />
      </Suspense>
    );
  }
  return <PlaceholderPage title={PAGE_TITLES[route.name]} />;
}

export function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = route.name === 'breathe' ? SITE_TITLE : `${PAGE_TITLES[route.name]} | ${SITE_TITLE}`;
    window.scrollTo(0, 0);
  }, [route]);

  return <Page route={route} />;
}
