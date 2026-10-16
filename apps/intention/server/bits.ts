/** Random bits: made with the platform's cryptographic generator, stored packed 8 to a byte. */

export type RandomBytes = (count: number) => Uint8Array;

export const cryptoBytes: RandomBytes = (count) => crypto.getRandomValues(new Uint8Array(count));

/** `count` fresh random bits as 0/1 values, made at the moment of the call. */
export function randomBits(count: number, randomBytes: RandomBytes = cryptoBytes): Uint8Array {
  const bytes = randomBytes(Math.ceil(count / 8));
  const bits = new Uint8Array(count);
  for (let i = 0; i < count; i++) bits[i] = (bytes[i >> 3]! >> (7 - (i & 7))) & 1;
  return bits;
}

/** Packs 0/1 values 8 to a byte, first bit in the highest bit of the first byte. */
export function packBits(bits: ArrayLike<number>): Uint8Array {
  const packed = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) if (bits[i]) packed[i >> 3]! |= 0x80 >> (i & 7);
  return packed;
}

/** The first `n` bits of packed bytes as 0/1 values. D1 returns blobs as arrays of numbers. */
export function unpackBits(packed: ArrayLike<number>, n: number): Uint8Array {
  const bits = new Uint8Array(Math.min(n, packed.length * 8));
  for (let i = 0; i < bits.length; i++) bits[i] = (packed[i >> 3]! >> (7 - (i & 7))) & 1;
  return bits;
}

/** Bits as a string of "0" and "1", the form they travel in. */
export function bitString(bits: ArrayLike<number>): string {
  let text = '';
  for (let i = 0; i < bits.length; i++) text += bits[i] ? '1' : '0';
  return text;
}
