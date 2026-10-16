import { GlobalChart } from '../components/GlobalChart.tsx';
import { HourPanel } from '../components/HourPanel.tsx';
import { Link } from '../components/Link.tsx';
import { useLoad } from '../hooks/useLoad.ts';
import { fetchGlobal, fetchHour } from '../lib/api.ts';
import { chartVerdict } from '../lib/chart.ts';
import { formatCount, formatZ, totalVerdict } from '../lib/copy.ts';
import { abandonedLine, KIND_LABELS, percent, runsByPeople, SOURCE_LABELS, WHEN_LABELS } from '../lib/global-copy.ts';
import type { GlobalAnswer, Group } from '../lib/totals-types.ts';

/** One split of the totals, as a list: easier to read on a phone than a wide table. */
function Split({ title, rows }: { title: string; rows: [string, Group][] }) {
  return (
    <section className="split">
      <h2 className="split-title">{title}</h2>
      <ul className="split-list">
        {rows.map(([label, group]) => (
          <li key={label} className="split-row">
            <span className="split-label">{label}</span>
            <span className="split-score num">{formatZ(group.combinedZ)}</span>
            <span className="split-detail">
              {group.runs === 0 ? 'No runs yet' : `${runsByPeople(group)}. ${percent(group.abandonedShare)} stopped early.`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Every run anyone has made, combined, with the chart and the splits. */
export function GlobalPage() {
  const global = useLoad(fetchGlobal);
  const hour = useLoad(fetchHour);
  return (
    <main className="page global">
      <nav className="page-nav">
        <Link to="" className="back-link">
          Back to the tug
        </Link>
      </nav>
      <h1 className="page-title">Everyone's runs</h1>
      <p className="lead">
        Every run anyone has made, added together. If intention moved the numbers, this line would leave the shaded
        area and stay out.
      </p>

      {global.state === 'loading' && <p className="muted">Loading the numbers.</p>}
      {global.state === 'error' && (
        <p role="alert">The numbers could not load. Check your connection and try again.</p>
      )}
      {global.state === 'ready' && <GlobalNumbers data={global.data} />}

      <HourPanel hour={hour.state === 'ready' ? hour.data : null} />
    </main>
  );
}

function GlobalNumbers({ data }: { data: GlobalAnswer }) {
  const { totals, chart } = data;
  if (totals.runs === 0) {
    return <p className="muted">No runs yet. Yours could be the first.</p>;
  }
  const lastBits = chart.bits.at(-1) ?? 0;
  const lastDeviation = chart.deviation.at(-1) ?? 0;
  return (
    <>
      <GlobalChart bits={chart.bits} deviation={chart.deviation} />
      <p>{chartVerdict(lastBits, lastDeviation)}</p>

      <section className="score-block" aria-labelledby="total-title">
        <h2 id="total-title" className="visually-hidden">
          Combined score
        </h2>
        <p className="big-score">{formatZ(totals.combinedZ)}</p>
        <p className="big-score-caption">how far from chance, all runs combined</p>
        <p>{totalVerdict(totals.combinedZ, totals.runs, 'the total')}</p>
      </section>

      <dl className="stats">
        <div>
          <dt>Runs</dt>
          <dd>{formatCount(totals.runs)}</dd>
        </div>
        <div>
          <dt>People</dt>
          <dd>{formatCount(totals.people)}</dd>
        </div>
        <div>
          <dt>Bits</dt>
          <dd>{formatCount(totals.bits)}</dd>
        </div>
        <div>
          <dt>Stopped early</dt>
          <dd>{percent(totals.abandonedShare)}</dd>
        </div>
      </dl>
      <p className="muted">
        People means devices: each phone or browser gets a random id, and we know nothing else about it.{' '}
        {abandonedLine(totals)}
        {data.inProgress > 0 &&
          ` ${formatCount(data.inProgress)} ${data.inProgress === 1 ? 'run is' : 'runs are'} in progress and will count when ${data.inProgress === 1 ? 'it ends' : 'they end'}.`}
      </p>

      <Split
        title="By when"
        rows={(['hour', 'anytime'] as const).map((key) => [WHEN_LABELS[key], data.byWhen[key]])}
      />
      <Split
        title="By random source"
        rows={Object.entries(data.bySource).map(([key, group]) => [SOURCE_LABELS[key] ?? key, group])}
      />
      {Object.keys(data.byKind).length > 1 && (
        <Split
          title="By exercise"
          rows={Object.entries(data.byKind).map(([key, group]) => [KIND_LABELS[key] ?? key, group])}
        />
      )}
      <p className="muted">The numbers update every 5 minutes.</p>
    </>
  );
}
