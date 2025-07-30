// Encryption and decryption utilities using AES-GCM for Readwise tokens.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
// Fallback for atob/btoa in Node.js
const atobFn =
  typeof atob === "function"
    ? atob
    : (input: string) => Buffer.from(input, "base64").toString("binary");
const btoaFn =
  typeof btoa === "function"
    ? btoa
    : (input: string) => Buffer.from(input, "binary").toString("base64");

/**
 * Import a base64-encoded key for AES-GCM.
 * @param key Base64-encoded key
 */
async function importKey(key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atobFn(key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt plaintext using AES-GCM with random IV.
 * @param plaintext string to encrypt
 * @param base64Key base64 encoded key
 * @returns base64(iv) + ':' + base64(ciphertext)
 */
export async function encrypt(
  plaintext: string,
  base64Key: string,
): Promise<string> {
  const key = await importKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ptBytes = encoder.encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ptBytes);
  const ivBase64 = btoaFn(String.fromCharCode(...iv));
  const ctArray = new Uint8Array(ct as ArrayBuffer);
  const ctBase64 = btoaFn(String.fromCharCode(...ctArray));
  return `${ivBase64}:${ctBase64}`;
}

/**
 * Decrypt ciphertext using AES-GCM.
 * @param data base64(iv) + ':' + base64(ciphertext)
 * @param base64Key base64 encoded key
 */
export async function decrypt(
  data: string,
  base64Key: string,
): Promise<string> {
  const [ivBase64, ctBase64] = data.split(":");
  const iv = Uint8Array.from(atobFn(ivBase64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atobFn(ctBase64), (c) => c.charCodeAt(0));
  const key = await importKey(base64Key);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return decoder.decode(pt as ArrayBuffer);
}
