import { useEffect, useState } from 'react';
import { LockIcon } from '../components/Icons';
import { Link } from '../components/Link';
import { ShapePreview } from '../components/ShapePreview';
import { MiniShape } from '../components/TechniquePicker';
import { chooseCustom } from '../hooks/useBreathScreen';
import { useUnlocked } from '../hooks/useUnlocked';
import { patternText } from '../lib/content';
import {
  addSavedPattern,
  clampCustomValue,
  customName,
  customToTechnique,
  DEFAULT_CUSTOM,
  MAX_PHASE_SECONDS,
  MAX_SAVED_PATTERNS,
  MIN_BREATH_SECONDS,
  removeSavedPattern,
  type CustomField,
  type CustomPattern,
} from '../lib/custom';
import { canSaveCustom } from '../lib/limits';
import { navigate } from '../lib/navigation';
import { loadSavedPatterns, loadSettings, saveSavedPatterns } from '../lib/store';
import { breathsPerMinute } from '../lib/techniques';
import '../styles/page.css';

const FIELDS: { field: CustomField; label: string }[] = [
  { field: 'in', label: 'Breathe in' },
  { field: 'holdIn', label: 'Hold, lungs full' },
  { field: 'out', label: 'Breathe out' },
  { field: 'holdOut', label: 'Hold, lungs empty' },
];

/** Whole-second steps on the buttons. Half seconds are allowed in the data for patterns like Resonant. */
const STEP = 1;

function minimumOf(field: CustomField): number {
  return field === 'in' || field === 'out' ? MIN_BREATH_SECONDS : 0;
}

function rate(pattern: CustomPattern): string {
  const perMinute = Math.round(breathsPerMinute(customToTechnique(pattern)) * 10) / 10;
  return `${perMinute} ${perMinute === 1 ? 'breath' : 'breaths'} a minute`;
}

export function CustomPage() {
  const unlocked = useUnlocked();
  const [pattern, setPattern] = useState<CustomPattern>(DEFAULT_CUSTOM);
  const [saved, setSaved] = useState<CustomPattern[]>([]);
  // Saving waits for the stored list, so a quick tap cannot write over patterns saved earlier.
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let live = true;
    void Promise.all([loadSettings(), loadSavedPatterns()]).then(([settings, patterns]) => {
      if (!live) return;
      if (settings.custom) setPattern(settings.custom);
      setSaved(patterns);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const technique = customToTechnique(pattern);
  const name = customName(pattern);
  const isSaved = saved.some((p) => customName(p) === name);

  const change = (field: CustomField, delta: number) => {
    setPattern((current) => ({ ...current, [field]: clampCustomValue(field, current[field] + delta) }));
    setMessage('');
  };

  const breathe = (chosen: CustomPattern) => {
    void chooseCustom(chosen).then(() => navigate(''));
  };

  const save = () => {
    if (!loaded) return;
    const next = addSavedPattern(saved, pattern);
    if (!next) {
      setMessage(`You have ${MAX_SAVED_PATTERNS} saved patterns. Delete one to save another.`);
      return;
    }
    setSaved(next);
    void saveSavedPatterns(next);
    setMessage(`Saved ${name}.`);
  };

  const remove = (target: CustomPattern) => {
    const next = removeSavedPattern(saved, target);
    setSaved(next);
    void saveSavedPatterns(next);
    setMessage(`Deleted ${customName(target)}.`);
  };

  return (
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to breathing
        </Link>
      </p>
      <h1 className="page-title">Custom patterns</h1>
      <p>
        Choose the seconds for each part of the breath. Breathing in and out take {MIN_BREATH_SECONDS} to{' '}
        {MAX_PHASE_SECONDS} seconds each. A hold can be 0, which leaves it out.
      </p>

      <div className="builder">
        <div className="builder-shape">
          <ShapePreview phases={technique.phases} label={`The shape of ${patternText(technique)}`} />
          <p className="builder-name">
            {name} <span className="builder-rate">{rate(pattern)}</span>
          </p>
        </div>

        <div className="steppers">
          {FIELDS.map(({ field, label }) => {
            const value = pattern[field];
            return (
              <div key={field} className="stepper" role="group" aria-labelledby={`${field}-label`}>
                <span className="stepper-label" id={`${field}-label`}>
                  {label}
                </span>
                <button
                  type="button"
                  className="stepper-button"
                  aria-label={`${label}: one second less`}
                  disabled={value <= minimumOf(field)}
                  onClick={() => change(field, -STEP)}
                >
                  <span aria-hidden="true">−</span>
                </button>
                <output className="stepper-value" aria-live="polite">
                  {value} s
                </output>
                <button
                  type="button"
                  className="stepper-button"
                  aria-label={`${label}: one second more`}
                  disabled={value >= MAX_PHASE_SECONDS}
                  onClick={() => change(field, STEP)}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="builder-actions">
        <button type="button" className="page-button" onClick={() => breathe(pattern)}>
          Breathe this pattern
        </button>
        {canSaveCustom(unlocked) ? (
          <button type="button" className="button-quiet" onClick={save} disabled={isSaved || !loaded}>
            {isSaved ? 'Saved' : 'Save it'}
          </button>
        ) : (
          <p className="builder-locked">
            <LockIcon /> Without the lifetime unlock a custom pattern runs as a 1 minute preview, and cannot be
            saved.{' '}
            <Link to="unlock" className="inline-link">
              See the lifetime unlock
            </Link>
          </p>
        )}
        <p role="status" className="page-status">
          {message}
        </p>
      </div>

      {unlocked && (
        <section className="page-section">
          <h2>
            Saved patterns <span className="saved-count">{saved.length} of {MAX_SAVED_PATTERNS}</span>
          </h2>
          {saved.length === 0 ? (
            <p>No saved patterns yet.</p>
          ) : (
            <ul className="saved">
              {saved.map((item) => {
                const itemName = customName(item);
                return (
                  <li key={itemName} className="saved-item">
                    <MiniShape phases={customToTechnique(item).phases} />
                    <span className="saved-name">{itemName}</span>
                    <button type="button" className="button-quiet" onClick={() => breathe(item)}>
                      Breathe
                    </button>
                    <button
                      type="button"
                      className="button-quiet"
                      aria-label={`Delete ${itemName}`}
                      onClick={() => remove(item)}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
