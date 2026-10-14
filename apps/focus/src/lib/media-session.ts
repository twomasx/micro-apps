/** Lock screen and notification controls. Does nothing where the Media Session API is missing. */

export interface MediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
}

export interface MediaSessionState {
  title: string;
  playing: boolean;
  /** Session length and time played, in seconds, for the lock screen progress bar. */
  durationSeconds?: number;
  positionSeconds?: number;
}

function session(): MediaSession | null {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null;
}

/** Wires the lock screen play and pause buttons. Returns a cleanup function. */
export function bindMediaSession(handlers: MediaSessionHandlers): () => void {
  const media = session();
  if (!media) return () => {};
  media.setActionHandler('play', handlers.onPlay);
  media.setActionHandler('pause', handlers.onPause);
  return () => {
    media.setActionHandler('play', null);
    media.setActionHandler('pause', null);
  };
}

export function setMediaSessionState(state: MediaSessionState): void {
  const media = session();
  if (!media) return;
  if (media.metadata?.title !== state.title) {
    media.metadata = new MediaMetadata({ title: state.title, artist: 'Focus' });
  }
  media.playbackState = state.playing ? 'playing' : 'paused';
  if (state.durationSeconds === undefined || state.positionSeconds === undefined) return;
  try {
    media.setPositionState({
      duration: state.durationSeconds,
      position: Math.min(state.durationSeconds, Math.max(0, state.positionSeconds)),
      playbackRate: 1,
    });
  } catch {
    // Some browsers reject a position for a live stream. The controls still work without it.
  }
}
