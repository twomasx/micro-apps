import { Link } from '../components/Link';

/** Screens that are built in later steps. Not shipped like this. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="page">
      <Link to="" className="page-back">
        Back to breathing
      </Link>
      <h1 className="page-title">{title}</h1>
      <p>This page is built in a later step.</p>
    </main>
  );
}
