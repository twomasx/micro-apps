const base = { 'aria-hidden': true, focusable: false } as const;

export function PlayIcon() {
  return (
    <svg {...base} width="22" height="22" viewBox="0 0 22 22">
      <path d="M6.5 3.6v14.8a.6.6 0 0 0 .92.5l11.3-7.4a.6.6 0 0 0 0-1L7.42 3.1a.6.6 0 0 0-.92.5z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg {...base} width="22" height="22" viewBox="0 0 22 22">
      <rect x="4.5" y="3" width="4.5" height="16" rx="1.2" fill="currentColor" />
      <rect x="13" y="3" width="4.5" height="16" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...base} className="lock-icon" width="10" height="12" viewBox="0 0 10 12">
      <path d="M2.6 5V3.6a2.4 2.4 0 0 1 4.8 0V5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="5" width="8" height="6" rx="1.4" fill="currentColor" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg {...base} width="20" height="20" viewBox="0 0 20 20">
      <circle cx="4" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="16" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base} width="18" height="18" viewBox="0 0 18 18">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
