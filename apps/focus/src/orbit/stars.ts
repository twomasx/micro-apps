/** Small seeded generator: the same sky on every visit and every resize. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paints one layer of the starfield. It is drawn once per size, not per frame. */
export function drawStars(canvas: HTMLCanvasElement, seed: number, density: number): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const random = seeded(seed);
  // Positions are fractions of the screen, so the same stars stay put when the size changes.
  const count = Math.round(density * Math.min(2.4, Math.max(1, (width * height) / 250_000)));
  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const y = random() * height;
    const size = random();
    const radius = 0.25 + size * size * 1.05;
    const alpha = 0.22 + random() * 0.5;
    const warm = random() < 0.18;
    ctx.fillStyle = warm ? `rgba(230,200,143,${alpha})` : `rgba(243,235,221,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
