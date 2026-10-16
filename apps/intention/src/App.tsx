import { useRun } from './hooks/useRun.ts';
import { formatZ, runVerdict } from './lib/copy.ts';
import { liveZ } from './lib/scoring.ts';
import { arrowFor } from './lib/tug.ts';

/**
 * Build step 1: a bare page that runs a real 20-second trial against the local functions.
 * The tug screen replaces it in step 2.
 */
export function App() {
  const { view, begin, stop } = useRun('tug');
  const { phase, start, n, deviation, end } = view;
  const colorName = (side: 'left' | 'right') => (side === 'left' ? 'Left color' : 'Right color');
  const mine = start ? colorName(start.aim) : '';
  const other = start ? colorName(start.aim === 'left' ? 'right' : 'left') : '';

  return (
    <main className="bare" data-phase={phase}>
      <h1>Intention: run test</h1>
      {start && (
        <p>
          Your color: <b>{mine}</b> {arrowFor(start.aim)} (aim {start.aim}, run {start.runId})
        </p>
      )}
      {start && (
        <dl>
          <dt>Bits shown</dt>
          <dd>
            {n} of {start.lengthBits}
          </dd>
          <dt>Deviation (1s minus 0s)</dt>
          <dd>{deviation}</dd>
          <dt>Live score</dt>
          <dd>{formatZ(liveZ(deviation, start.aim, n))}</dd>
        </dl>
      )}
      {phase === 'done' && start && (
        <p>
          {end
            ? `Score ${formatZ(end.z)}. ${runVerdict(end.z, mine, other)}`
            : `You stopped early. The run is saved with the bits it had and counts, scored over all ${start.lengthBits} planned bits.`}{' '}
          <a href={`${import.meta.env.BASE_URL}api/runs/${start.runId}`}>Every bit of this run</a>
        </p>
      )}
      {phase === 'error' && <p role="alert">The run could not start or lost its connection ({view.errorCode}).</p>}
      {phase === 'running' || phase === 'starting' ? (
        <button type="button" onClick={stop}>
          Stop
        </button>
      ) : (
        <button type="button" onClick={() => void begin()}>
          {phase === 'idle' ? 'Begin' : 'Begin again'}
        </button>
      )}
    </main>
  );
}
