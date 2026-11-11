import { ValidationError } from "./errors.js";

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i;
}

/**
 * Encodes a Uint8Array to standard Base64 string.
 */
export function encodeBase64(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.length;
  let i = 0;

  for (; i + 2 < len; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1]!;
    const b2 = bytes[i + 2]!;
    result +=
      BASE64_CHARS[(b0 >> 2) & 0x3f]! +
      BASE64_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f]! +
      BASE64_CHARS[((b1 << 2) | (b2 >> 6)) & 0x3f]! +
      BASE64_CHARS[b2 & 0x3f]!;
  }

  if (i < len) {
    const b0 = bytes[i]!;
    if (i + 1 < len) {
      const b1 = bytes[i + 1]!;
      result +=
        BASE64_CHARS[(b0 >> 2) & 0x3f]! +
        BASE64_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f]! +
        BASE64_CHARS[(b1 << 2) & 0x3f]! +
        "=";
    } else {
      result +=
        BASE64_CHARS[(b0 >> 2) & 0x3f]! +
        BASE64_CHARS[(b0 << 4) & 0x3f]! +
        "==";
    }
  }

  return result;
}

/**
 * Decodes a Base64 string into a Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
  const sanitized = base64.replace(/[\s=]/g, "");
  const len = sanitized.length;
  const byteLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = BASE64_LOOKUP[sanitized.charCodeAt(i)] ?? 0;
    const c1 = BASE64_LOOKUP[sanitized.charCodeAt(i + 1)] ?? 0;
    const c2 = i + 2 < len ? (BASE64_LOOKUP[sanitized.charCodeAt(i + 2)] ?? 0) : 0;
    const c3 = i + 3 < len ? (BASE64_LOOKUP[sanitized.charCodeAt(i + 3)] ?? 0) : 0;

    if (p < byteLen) bytes[p++] = (c0 << 2) | (c1 >> 4);
    if (p < byteLen) bytes[p++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
    if (p < byteLen) bytes[p++] = ((c2 & 0x03) << 6) | c3;
  }

  return bytes;
}

/**
 * Encodes a Uint8Array to URL-safe Base64 (RFC 4648 §5).
 */
export function encodeBase64Url(bytes: Uint8Array): string {
  return encodeBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes a URL-safe Base64 string to a Uint8Array.
 */
export function decodeBase64Url(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return decodeBase64(base64);
}

/**
 * Encodes a string to UTF-8 Uint8Array.
 */
export function stringToUtf8Bytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decodes a UTF-8 Uint8Array to string.
 */
export function utf8BytesToString(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (err) {
    throw new ValidationError(`Invalid UTF-8 sequence: ${err instanceof Error ? err.message : String(err)}`);
  }
}
