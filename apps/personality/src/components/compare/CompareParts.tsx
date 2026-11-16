import { share } from '@micro/platform';
import { useState } from 'react';
import { appHref } from '../../lib/navigation.ts';
import { shareMessage } from '../../lib/share-message.ts';
import { Prose } from '../Prose.tsx';
import { UnlockOffer } from '../UnlockOffer.tsx';

export const SIMILARITY_LABEL = 'How similar your answers are';

/** The note under the similarity number. `scales` is "four scales" or "five traits". */
export function similarityNote(scales: string): string {
  return `This is 100 minus the average gap between the two scores on the ${scales}. It is not a prediction. Research finds that having similar personalities predicts relationship satisfaction only weakly.`;
}

export function Similarity({ value, scales }: { value: number; scales: string }) {
  return (
    <section className="compare-similarity">
      <p className="compare-similarity-value">{Math.round(value)}%</p>
      <h2 className="compare-similarity-label">{SIMILARITY_LABEL}</h2>
      <p className="compare-similarity-note">{similarityNote(scales)}</p>
    </section>
  );
}

export interface CoupleSectionView {
  key: string;
  heading: string;
  title: string;
  body: string;
  questions: string[];
}

/** The couple report once unlocked, or what it holds and the one-time unlock. */
export function CoupleReport({ sections, lead, back }: { sections: CoupleSectionView[] | null; lead: string; back: string }) {
  if (!sections) {
    return (
      <section className="compare-offer">
        <h2 className="compare-couple-title">Couple report</h2>
        <p className="compare-offer-lead">{lead}</p>
        <UnlockOffer back={back} />
      </section>
    );
  }
  return (
    <section className="compare-couple">
      <h2 className="compare-couple-title">Couple report</h2>
      {sections.map((section) => (
        <article key={section.key} className="compare-couple-section" data-scale={section.key}>
          <h3 className="compare-couple-heading">
            <span className="compare-couple-tag">{section.heading}</span> {section.title}
          </h3>
          <Prose body={section.body} />
          <h4 className="compare-couple-questions-title">Questions to talk through</h4>
          <ul className="compare-couple-questions">
            {section.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

/** Send the comparison to someone. */
export function ShareComparison({ path, title }: { path: string; title: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const send = async () => {
    setMessage(shareMessage(await share({ title, url: `${window.location.origin}${appHref(path)}` })));
  };
  return (
    <section className="compare-share">
      <button type="button" className="compare-share-button" onClick={() => void send()}>
        Send this comparison
      </button>
      <p className="compare-note">Anyone who has the link can see both results.</p>
      {message && (
        <p className="compare-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
