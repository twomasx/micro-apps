import { Link } from '../components/Link';

export function NotFoundPage() {
  return (
    <main className="screen page">
      <h1 className="title">Page not found</h1>
      <p>
        <Link to="">Back to today</Link>
      </p>
    </main>
  );
}
