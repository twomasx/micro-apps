import { appConfig } from '../app.config';

export function App() {
  return (
    <main>
      <p>{appConfig.name}</p>
      <p>{import.meta.env.BASE_URL}</p>
      <p>skeleton</p>
    </main>
  );
}
