import { useCallback, useState } from 'react';
import { GlobalChart } from '../components/GlobalChart.tsx';
import { Link } from '../components/Link.tsx';
import { useLoad } from '../hooks/useLoad.ts';
import { fetchMe, fetchMeCsv } from '../lib/api.ts';
import { formatCount, formatZ, totalVerdict } from '../lib/copy.ts';
import { getDeviceId } from '../lib/device.ts';
import { runDetails, runWhen } from '../lib/me-copy.ts';
import type { MeAnswer } from '../lib/me-types.ts';
import { priceLine } from '../lib/products.ts';
import { pass } from '../lib/pass-state.ts';
import { loadUnlockCode } from '../lib/unlock-store.ts';

interface Loaded {
  me: MeAnswer;
  deviceId: string;
  code: string | null;
}

async function loadMe(): Promise<Loaded> {
  const [deviceId, code] = await Promise.all([getDeviceId(), loadUnlockCode()]);
  return { me: await fetchMe(deviceId, code), deviceId, code };
}

/** Your runs on this device: the last few, or with Lab Pass every one, your total and your chart. */
export function MePage() {
  const loaded = useLoad(loadMe);
  return (
    <main className="page me">
      <nav className="page-nav">
        <Link to="" className="back-link">
          Back to Intention
        </Link>
      </nav>
      <h1 className="page-title">Your runs</h1>
      {loaded.state === 'loading' && <p className="muted">Loading your runs.</p>}
      {loaded.state === 'error' && <p role="alert">Your runs could not load. Check your connection and try again.</p>}
      {loaded.state === 'ready' && <MeContent {...loaded.data} />}
    </main>
  );
}

function MeContent({ me, deviceId, code }: Loaded) {
  const [csv, setCsv] = useState<'idle' | 'working' | 'failed'>('idle');
  const download = useCallback(async () => {
    if (!code && !pass.isActive()) return;
    setCsv('working');
    try {
      const blob = await fetchMeCsv(deviceId, code);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'intention-runs.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      setCsv('idle');
    } catch {
      setCsv('failed');
    }
  }, [code, deviceId]);

  if (me.totalRuns === 0) {
    return (
      <>
        <p className="lead">No runs yet. Your runs show here after you pull.</p>
        <p>
          <Link to="">Start your first run</Link>
        </p>
      </>
    );
  }

  return (
    <>
      {me.lifetime && me.chart ? (
        <>
          <section className="score-block" aria-labelledby="lifetime-title">
            <h2 id="lifetime-title" className="visually-hidden">
              Your lifetime total
            </h2>
            <p className="big-score">{formatZ(me.lifetime.combinedZ)}</p>
            <p className="big-score-caption">your lifetime total, how far from chance</p>
            <p>{totalVerdict(me.lifetime.combinedZ, me.lifetime.runs)}</p>
          </section>
          <GlobalChart bits={me.chart.bits} deviation={me.chart.deviation} />
        </>
      ) : (
        <p className="lead">
          {me.totalRuns > me.runs.length
            ? `Your last ${me.runs.length} of ${formatCount(me.totalRuns)} runs.`
            : me.totalRuns === 1
              ? 'Your first run.'
              : `Your ${formatCount(me.totalRuns)} runs so far.`}
        </p>
      )}

      <ol className="run-list" aria-label="Runs, newest first">
        {me.runs.map((run) => (
          <li key={run.runId} className="run-item" data-status={run.status}>
            <span className="run-when">{runWhen(run.createdAt)}</span>
            <span className="run-score num">{formatZ(run.z)}</span>
            <span className="run-details">{runDetails(run)}</span>
            <a className="run-bits" href={`${import.meta.env.BASE_URL}api/runs/${run.runId}`}>
              Every bit of this run
            </a>
          </li>
        ))}
      </ol>

      {!me.full && (
        <section className="offer" aria-labelledby="offer-title">
          <h2 id="offer-title">Your full history</h2>
          <p>Lab Pass shows every run you have made, your lifetime total and your own running chart, and lets you download it all.</p>
          <p className="price">{priceLine()}</p>
          <Link to="unlock" className="button-primary">
            See Lab Pass
          </Link>
        </section>
      )}

      {/* The server said Lab Pass applies: this app's own code or an all-app pass. */}
      {me.full && (
        <p>
          <button type="button" className="button-secondary" onClick={() => void download()} disabled={csv === 'working'}>
            {csv === 'working' ? 'Preparing the file' : 'Download your data (CSV)'}
          </button>
          {csv === 'failed' && <span role="alert"> The download failed. Try again.</span>}
        </p>
      )}
      <p className="muted">
        Runs are kept with this device's random id. Clearing this site's data in your browser starts a new list.
      </p>
    </>
  );
}
