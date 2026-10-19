const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown'] as const;

/**
 * Mobile browsers keep an AudioContext suspended until a user gesture.
 * Resumes the context on the first tap or key press. Returns a cleanup function.
 */
export function unlockAudioOnTap(context: AudioContext, target: EventTarget = document): () => void {
  const cleanup = () => {
    for (const type of UNLOCK_EVENTS) target.removeEventListener(type, unlock);
  };
  const unlock = () => {
    if (context.state === 'closed') {
      cleanup();
      return;
    }
    context.resume().then(
      () => {
        if (context.state === 'running') cleanup();
      },
      () => undefined,
    );
  };
  for (const type of UNLOCK_EVENTS) target.addEventListener(type, unlock, { passive: true });
  return cleanup;
}
