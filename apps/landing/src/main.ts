import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles.css';
import { experiments } from './content.ts';
import { watchSpecimens } from './motion.ts';
import { openAppsWithPass } from './pass-links.ts';

watchSpecimens(document);
openAppsWithPass(
  document,
  experiments.map((e) => e.path),
);
