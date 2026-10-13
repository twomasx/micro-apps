export function ResultPage({ id }: { id: string }) {
  return (
    <main className="result" data-result-id={id}>
      <h1 className="result-title">Your result</h1>
      <p>Your answers are saved. The result page comes in the next build step.</p>
    </main>
  );
}
