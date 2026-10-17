// Runs before the page first paints. A browser that holds a pass hides the offer until the app shows
// "Your pass", so the offer never flashes first. Search engines and new visitors see the offer as usual.
/* global document, localStorage */
// The app keeps the flag (pass:has-pass) in step with the saved pass: src/lib/pass-hint.ts.
try {
  if (localStorage.getItem('pass:has-pass') === '1') document.documentElement.dataset.passHint = 'has-pass';
} catch {
  // Storage is blocked: the offer shows first, as before.
}
