const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** A random, unguessable id for records on this device. 16 characters from crypto randomness. */
export function randomId(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}
