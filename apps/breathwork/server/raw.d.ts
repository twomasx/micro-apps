// Vite's ?raw import, used by the tests to load migration files as text.
declare module '*.sql?raw' {
  const sql: string;
  export default sql;
}
