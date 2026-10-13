import { Link } from '../components/Link.tsx';
import { useLoaded } from '../hooks/useLoaded.ts';
import { navigate } from '../lib/navigation.ts';
import { answeredCount, restoreProgress } from '../lib/progress.ts';
import { CURRENT_VERSION, currentQuestions } from '../lib/questions.ts';
import { clearProgress, loadProgress, loadResults } from '../lib/store.ts';

async function loadSaved() {
  const progress = restoreProgress(await loadProgress(CURRENT_VERSION), currentQuestions);
  const results = await loadResults();
  return {
    answered: progress ? answeredCount(progress) : 0,
    lastResult: results.at(-1),
  };
}

export function IntroPage() {
  const saved = useLoaded(loadSaved);
  const answered = saved?.answered ?? 0;
  const total = currentQuestions.items.length;

  const startOver = async () => {
    await clearProgress(CURRENT_VERSION);
    navigate('test');
  };

  return (
    <main className="intro" data-in-progress={answered > 0}>
      <p className="intro-kicker">Four scales. Sixteen types.</p>
      <h1 className="intro-title">Personality test</h1>
      <p className="intro-lead">
        You get a four-letter type and a percentage on each of the four scales.
      </p>

      <dl className="intro-specs">
        <div className="intro-spec">
          <dt>Questions</dt>
          <dd>{total}</dd>
        </div>
        <div className="intro-spec">
          <dt>Minutes</dt>
          <dd>~6</dd>
        </div>
        <div className="intro-spec">
          <dt>For the result</dt>
          <dd>$0</dd>
        </div>
      </dl>

      <p className="intro-free">The result is free. You do not need an account.</p>
      <p className="intro-instructions">{currentQuestions.instructions}</p>

      {answered > 0 ? (
        <div className="intro-actions">
          <p className="intro-progress">
            You have answered {answered} of {total} questions.
          </p>
          <Link to="test" className="intro-start">
            Continue the test
          </Link>
          <button type="button" className="intro-restart" onClick={() => void startOver()}>
            Start over
          </button>
        </div>
      ) : (
        <div className="intro-actions">
          <Link to="test" className="intro-start">
            Start the test
          </Link>
        </div>
      )}

      {saved?.lastResult && (
        <p className="intro-last-result">
          <span className="intro-last-result-label">Your last result:</span>{' '}
          <Link to={`r/${saved.lastResult.id}`} className="intro-last-result-link">
            {saved.lastResult.type}
          </Link>
        </p>
      )}
    </main>
  );
}
