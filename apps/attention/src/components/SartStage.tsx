import { useSartRun, type SartRunOptions } from '../hooks/useSartRun';

interface SartStageProps extends SartRunOptions {
  onStop: () => void;
}

/** The test itself: one digit or the mask at a time, nothing else on the page. */
export function SartStage({ onStop, ...options }: SartStageProps) {
  const stageRef = useSartRun(options);
  return (
    <main className="sart" data-practice={options.practice}>
      <div ref={stageRef} className="sart-stage" data-show="lead" aria-live="off">
        <button type="button" className="text-button sart-stop" onClick={onStop}>
          Stop
        </button>
        <span className="sart-digit" aria-hidden="true" />
        <svg className="sart-mask" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="44" />
          <path d="M18.9 18.9 81.1 81.1M81.1 18.9 18.9 81.1" />
        </svg>
        <p className="sart-feedback" aria-live="polite" />
        <p className="sart-lead">Get ready</p>
      </div>
    </main>
  );
}
