const base = { 'aria-hidden': true, focusable: false } as const;
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function PlayIcon() {
  return (
    <svg {...base} width="28" height="28" viewBox="0 0 28 28">
      <path d="M9 5.6v16.8a1 1 0 0 0 1.5.86l13.4-8.4a1 1 0 0 0 0-1.72L10.5 4.74A1 1 0 0 0 9 5.6z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg {...base} width="28" height="28" viewBox="0 0 28 28">
      <rect x="6.5" y="5" width="5.5" height="18" rx="1.6" fill="currentColor" />
      <rect x="16" y="5" width="5.5" height="18" rx="1.6" fill="currentColor" />
    </svg>
  );
}

/** Start again: a square path with an arrow, like the Box shape coming round again. */
export function AgainIcon() {
  return (
    <svg {...base} width="28" height="28" viewBox="0 0 28 28">
      <path {...stroke} strokeWidth={3} d="M21 9.5A8.5 8.5 0 1 0 22.5 15" />
      <path d="M17.2 4.6l6.4 1.2-1.6 6.3z" fill="currentColor" />
    </svg>
  );
}

export function SoundOnIcon() {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24">
      <path d="M4 9.2h3.3L12 5v14l-4.7-4.2H4z" fill="currentColor" />
      <path {...stroke} d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.4a8 8 0 0 1 0 11.2" />
    </svg>
  );
}

export function SoundOffIcon() {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24">
      <path d="M4 9.2h3.3L12 5v14l-4.7-4.2H4z" fill="currentColor" />
      <path {...stroke} d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="2.2" fill="currentColor" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <circle cx="19" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24">
      <path {...stroke} d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...base} className="lock-icon" width="12" height="14" viewBox="0 0 12 14">
      <path d="M3.2 6V4.3a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="1" y="6" width="10" height="7" rx="1.8" fill="currentColor" />
    </svg>
  );
}
