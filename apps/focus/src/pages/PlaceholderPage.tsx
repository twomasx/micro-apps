import { Link } from '../components/Link';
import '../styles/page.css';

/** Stands in for a page that a later build step writes. */
export function PlaceholderPage({ title, text }: { title: string; text: string }) {
  return (
    <main className="page">
      <h1 className="page-title">{title}</h1>
      <p>{text}</p>
      <p>
        <Link to="" className="page-link">
          Back to the player
        </Link>
      </p>
    </main>
  );
}
