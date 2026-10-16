import type { BitsEvent, EndEvent, Kind, RunResult, RunSeconds, StartEvent, StartRequest } from './protocol.ts';
import { ApiError, apiUrl, getJson } from './api.ts';
import { SseParser } from './sse.ts';

export { ApiError };

export interface RunHandlers {
  onStart: (start: StartEvent) => void;
  onBits: (batch: BitsEvent) => void;
  onEnd: (end: EndEvent) => void;
}

/**
 * Starts a run and reads its one streamed response until the end event.
 * Aborting the signal closes the connection; the server then saves the run as abandoned.
 * Resolves when the stream ends. Throws if the run could not start or the connection broke.
 */
export async function streamRun(
  options: { deviceId: string; kind: Kind; seconds?: RunSeconds },
  handlers: RunHandlers,
  signal: AbortSignal,
): Promise<void> {
  const body: StartRequest = { deviceId: options.deviceId, kind: options.kind, seconds: options.seconds };
  const response = await fetch(apiUrl('runs'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  });
  if (!response.ok || !response.body) {
    const answer = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, answer?.error ?? null);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const parser = new SseParser();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    for (const { event, data } of parser.push(value)) {
      if (event === 'start') handlers.onStart(JSON.parse(data) as StartEvent);
      else if (event === 'bits') handlers.onBits(JSON.parse(data) as BitsEvent);
      else if (event === 'end') handlers.onEnd(JSON.parse(data) as EndEvent);
    }
  }
}

export function fetchRun(runId: string): Promise<RunResult> {
  return getJson<RunResult>(`runs/${encodeURIComponent(runId)}`, { cache: 'no-store' });
}
