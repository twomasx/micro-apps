// Vite's ?raw import, used by the tests to load SQL files as text.
declare module '*.sql?raw' {
  const sql: string;
  export default sql;
}
