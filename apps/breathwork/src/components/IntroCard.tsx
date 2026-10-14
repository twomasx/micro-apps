import { HOW_TO_FOLLOW, SAFETY_LINE } from '../lib/content';
import { Link } from './Link';

/** The first-visit card under the shape while it draws itself. Start answers it. */
export function IntroCard({ onStart }: { onStart: () => void }) {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <h2 id="intro-title" className="intro-title">
        Follow the shape
      </h2>
      <p className="intro-text">{HOW_TO_FOLLOW}</p>
      <p className="intro-safety">
        {SAFETY_LINE}{' '}
        <Link to="science" className="intro-link">
          More on the science
        </Link>
      </p>
      <button type="button" className="go-wide" onClick={onStart}>
        Start
      </button>
    </section>
  );
}
