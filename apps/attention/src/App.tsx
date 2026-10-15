import { lazy, Suspense } from 'react';
import { useRoute } from './hooks/useRoute';

// The sound check page is for development only. It is left out of the production build.
const SoundsPage = import.meta.env.DEV
  ? lazy(() => import('./pages/SoundsPage').then((module) => ({ default: module.SoundsPage })))
  : null;

export function App() {
  const route = useRoute();

  if (route.name === 'sounds' && SoundsPage) {
    return (
      <Suspense fallback={null}>
        <SoundsPage />
      </Suspense>
    );
  }
  return (
    <main>
      <h1>Attention</h1>
      <p>The training screens come in step 2.</p>
    </main>
  );
}
