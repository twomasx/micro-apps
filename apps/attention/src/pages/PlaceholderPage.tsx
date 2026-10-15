import { Link } from '../components/Link';

/** Pages built in later steps. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="screen page">
      <h1 className="title">{title}</h1>
      <p className="lead">This page is built in a later step.</p>
      <p>
        <Link to="">Back to today</Link>
      </p>
    </main>
  );
}
