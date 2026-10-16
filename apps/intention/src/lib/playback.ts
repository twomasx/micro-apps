/**
 * Plays received bits back at the rate they were made, so the screen moves bit by bit instead of
 * jumping every 250 ms. Each bit's moment on screen is fixed when the first batch arrives:
 * bit i shows at firstArrival + (i + 1) × (1000 / bitsPerSecond). Bits that arrive late show as soon as
 * they arrive. Nothing is invented and nothing is smoothed: what is on screen is always a real prefix
 * of the run's bits.
 */
export class BitPlayback {
  private readonly bits: number[] = [];
  private firstArrival: number | null = null;
  private shown = 0;
  private deviation = 0;

  constructor(private readonly bitsPerSecond: number) {}

  /** Adds a batch of "0"/"1" characters that arrived at `now` (milliseconds). */
  push(batch: string, now: number): void {
    this.firstArrival ??= now;
    for (const char of batch) this.bits.push(char === '1' ? 1 : 0);
  }

  /** Bits received so far. */
  get received(): number {
    return this.bits.length;
  }

  /**
   * Moves the display forward to `now`. Returns the bits that became visible, oldest first,
   * with the running totals after them.
   */
  advance(now: number): { newBits: number[]; n: number; deviation: number } {
    const due =
      this.firstArrival === null ? 0 : Math.floor(((now - this.firstArrival) * this.bitsPerSecond) / 1000) + 1;
    const target = Math.min(this.bits.length, Math.max(this.shown, due));
    const newBits = this.bits.slice(this.shown, target);
    for (const bit of newBits) this.deviation += bit ? 1 : -1;
    this.shown = target;
    return { newBits, n: this.shown, deviation: this.deviation };
  }

  /** Shows everything received at once, for the end of a run or reduced motion. */
  flush(): { newBits: number[]; n: number; deviation: number } {
    return this.advance(Number.POSITIVE_INFINITY);
  }
}
