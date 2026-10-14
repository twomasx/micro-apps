const SAMPLE_RATE = 8000;

/** A WAV file of silence (8-bit mono). Looped in an audio element, it keeps a media session open. */
export function createSilentWav(seconds: number): Uint8Array<ArrayBuffer> {
  const samples = Math.max(1, Math.round(seconds * SAMPLE_RATE));
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE, true); // bytes per second
  view.setUint16(32, 1, true); // bytes per frame
  view.setUint16(34, 8, true); // bits per sample
  text(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit PCM is unsigned: 128 is silence
  return bytes;
}
