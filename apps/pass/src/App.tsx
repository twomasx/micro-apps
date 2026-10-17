import { useEffect } from 'react';
import { Frame } from './components/Frame';
import { TestModeLabel } from './components/TestModeLabel';
import { useRoute } from './hooks/useRoute';
import type { Route } from './lib/router';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RestorePage } from './pages/RestorePage';
import { ThanksPage } from './pages/ThanksPage';
import { PAGES } from './seo';

const SITE_TITLE = 'PolymadLabs pass';
const TITLES: Record<Route['name'], string> = {
  home: PAGES.home.title,
  thanks: `Thank you | ${SITE_TITLE}`,
  restore: `Enter your code | ${SITE_TITLE}`,
  privacy: PAGES.privacy.title,
  notFound: `Page not found | ${SITE_TITLE}`,
};

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'thanks':
      return <ThanksPage sessionId={route.sessionId} />;
    case 'restore':
      return <RestorePage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'notFound':
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = TITLES[route.name];
  }, [route]);

  return (
    <>
      <TestModeLabel />
      <Frame>
        <Page route={route} />
      </Frame>
    </>
  );
}
