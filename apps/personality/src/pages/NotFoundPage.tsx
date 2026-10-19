import { Link } from '../components/Link.tsx';

export function NotFoundPage() {
  return (
    <main className="not-found">
      <h1 className="not-found-title">Page not found</h1>
      <p>
        <Link to="" className="home-link">
          Go to the personality test
        </Link>
      </p>
    </main>
  );
}
