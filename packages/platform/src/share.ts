export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

/** Web Share API, falling back to copying the url or text to the clipboard. */
export async function share(data: ShareData): Promise<ShareResult> {
  if (typeof navigator === 'undefined') return 'unavailable';

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  const fallback = data.url ?? data.text;
  if (fallback && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(fallback);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }
  return 'unavailable';
}
