import './styles/fonts.css';
import './styles/base.css';
import './styles/observatory.css';
import { experiments } from './content.ts';
import { watchSpecimens } from './motion.ts';
import { openAppsWithPass } from './pass-links.ts';

watchSpecimens(document);
openAppsWithPass(
  document,
  experiments.map((e) => e.path),
);
