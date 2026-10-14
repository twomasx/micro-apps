import { Link } from '../components/Link';
import '../styles/page.css';

export function NotFoundPage() {
  return (
    <main className="page">
      <h1 className="page-title">Page not found</h1>
      <p>There is no page at this address.</p>
      <p>
        <Link to="" className="page-link">
          Go to breathing
        </Link>
      </p>
    </main>
  );
}
