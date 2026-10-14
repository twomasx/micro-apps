import { lazy, Suspense, useEffect } from 'react';
import { useRoute } from './hooks/useRoute';
import type { Route } from './lib/router';

const SITE_TITLE = 'Breathwork';

// The engine test page is for development only. It is left out of the production build.
const BenchPage = import.meta.env.DEV
  ? lazy(() => import('./pages/BenchPage').then((module) => ({ default: module.BenchPage })))
  : null;

function Page({ route }: { route: Route }) {
  if (route.name === 'bench' && BenchPage) {
    return (
      <Suspense fallback={null}>
        <BenchPage />
      </Suspense>
    );
  }
  // The screens come in step 2 and later.
  return (
    <main>
      <h1>Breathwork</h1>
      <p>Coming soon.</p>
    </main>
  );
}

export function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = route.name === 'bench' ? `Engine test | ${SITE_TITLE}` : SITE_TITLE;
  }, [route]);

  return <Page route={route} />;
}
