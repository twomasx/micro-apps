import { Link } from '../components/Link';

export function NotFoundPage() {
  return (
    <main className="not-found">
      <section className="pass-hero" aria-labelledby="not-found-title">
        <div className="pass-hero-text">
          <p className="eyebrow">Error 404</p>
          <h1 className="pass-title" id="not-found-title">
            Page not found
          </h1>
          <p className="pass-lead">There is no page at this address.</p>
          <Link to="" className="button-link">
            Go to the PolymadLabs pass
          </Link>
        </div>
      </section>
    </main>
  );
}
