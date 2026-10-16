import { Link } from '../components/Link.tsx';

export function NotFoundPage() {
  return (
    <main className="page">
      <h1 className="page-title">Page not found</h1>
      <p className="lead">There is nothing at this address.</p>
      <p>
        <Link to="">Go to the tug of war</Link>
      </p>
    </main>
  );
}
