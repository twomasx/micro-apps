import { useEffect } from 'react';
import { TestModeLabel } from './components/TestModeLabel.tsx';
import { useRoute } from './hooks/useRoute.ts';
import type { Route } from './lib/router.ts';
import { PAGES } from './seo.ts';
import { GlobalPage } from './pages/GlobalPage.tsx';
import { MePage } from './pages/MePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { RestorePage } from './pages/RestorePage.tsx';
import { SciencePage } from './pages/SciencePage.tsx';
import { TugPage } from './pages/TugPage.tsx';
import { UnlockPage } from './pages/UnlockPage.tsx';

const SITE_TITLE = 'Intention';

/** Tab titles for pages search engines never see. The others use src/seo.ts, the same as the HTML the server sent. */
const PAGE_TITLES: Record<Exclude<Route['name'], keyof typeof PAGES>, string> = {
  me: 'Your runs',
  unlock: 'Lab Pass',
  restore: 'Restore Lab Pass',
  notFound: 'Page not found',
};

function titleFor(name: Route['name']): string {
  return name in PAGES ? PAGES[name as keyof typeof PAGES].title : `${PAGE_TITLES[name as keyof typeof PAGE_TITLES]} | ${SITE_TITLE}`;
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'tug':
      return <TugPage />;
    case 'global':
      return <GlobalPage />;
    case 'me':
      return <MePage />;
    case 'science':
      return <SciencePage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'unlock':
      return <UnlockPage sessionId={route.sessionId} />;
    case 'restore':
      return <RestorePage />;
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();
  useEffect(() => {
    document.title = titleFor(route.name);
    if (route.name !== 'tug') window.scrollTo(0, 0);
  }, [route.name]);
  return (
    <>
      <TestModeLabel />
      <Page route={route} />
    </>
  );
}
