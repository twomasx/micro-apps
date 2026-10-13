import { proseBlocks } from '../lib/prose.ts';

/** Renders a content section: paragraphs and plain lists. */
export function Prose({ body }: { body: string }) {
  return (
    <>
      {proseBlocks(body).map((block, position) =>
        block.type === 'list' ? (
          <ul key={position} className="prose-list">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={position}>{block.text}</p>
        ),
      )}
    </>
  );
}
