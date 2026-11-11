import { ValidationError } from "../shared/errors.js";
import { assertNumber, assertString } from "../shared/validation.js";
import type {
  BytesToAsciiOptions,
  BytesToHexOptions,
  HexRow,
  HexViewOptions,
  HexViewResult,
} from "./types.js";

export * from "./types.js";

function toUint8Array(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw new ValidationError("Expected input to be a Uint8Array or ArrayBuffer");
}

/**
 * Formats a single byte as a 2-character hexadecimal string.
 */
function byteToHex(b: number, uppercase = true): string {
  const hex = b.toString(16).padStart(2, "0");
  return uppercase ? hex.toUpperCase() : hex.toLowerCase();
}

/**
 * Converts a sequence of bytes into a hexadecimal string representation.
 */
export function bytesToHex(
  input: Uint8Array | ArrayBuffer,
  options?: BytesToHexOptions
): string {
  const bytes = toUint8Array(input);
  const separator = options?.separator ?? " ";
  const uppercase = options?.uppercase ?? true;

  const hexArray: string[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hexArray[i] = byteToHex(bytes[i]!, uppercase);
  }

  return hexArray.join(separator);
}

/**
 * Converts a sequence of bytes into an ASCII gutter string, replacing non-printable bytes.
 */
export function bytesToAscii(
  input: Uint8Array | ArrayBuffer,
  options?: BytesToAsciiOptions
): string {
  const bytes = toUint8Array(input);
  const nonPrintable = options?.nonPrintableChar ?? ".";

  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if (b >= 32 && b <= 126) {
      result += String.fromCharCode(b);
    } else {
      result += nonPrintable;
    }
  }

  return result;
}

/**
 * Parses an arbitrary hexadecimal string (e.g. "48 65 6C 6C 6F", "0x48, 0x65", "48656c6c6f") into a Uint8Array.
 */
export function parseHexString(hexString: string): Uint8Array {
  assertString(hexString, "hex string");
  const cleaned = hexString.replace(/0x/gi, "").replace(/[\s,;:\-_]/g, "");

  if (cleaned.length % 2 !== 0) {
    throw new ValidationError(
      `Hex string must contain an even number of characters. Got ${cleaned.length} characters.`
    );
  }

  if (/[^0-9a-fA-F]/.test(cleaned)) {
    throw new ValidationError("Hex string contains non-hexadecimal characters");
  }

  const byteLen = cleaned.length / 2;
  const bytes = new Uint8Array(byteLen);

  for (let i = 0; i < byteLen; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Formats binary data as a structured hexadecimal table view with an ASCII gutter.
 */
export function formatHexView(
  input: Uint8Array | ArrayBuffer,
  options?: HexViewOptions
): HexViewResult {
  const allBytes = toUint8Array(input);

  const bytesPerRow = options?.bytesPerRow ?? 16;
  if (bytesPerRow <= 0 || !Number.isInteger(bytesPerRow)) {
    throw new ValidationError("bytesPerRow must be a positive integer");
  }

  const offsetWidth = options?.offsetWidth ?? 8;
  const startOffset = options?.startOffset ?? 0;
  assertNumber(startOffset, "startOffset");

  const uppercase = options?.uppercase ?? true;
  const showOffset = options?.showOffset ?? true;
  const showAscii = options?.showAscii ?? true;
  const nonPrintable = options?.nonPrintableChar ?? ".";

  const sliceStart = Math.min(startOffset, allBytes.length);
  const maxBytes = options?.maxBytes ?? (allBytes.length - sliceStart);
  const sliceEnd = Math.min(sliceStart + maxBytes, allBytes.length);

  const bytes = allBytes.subarray(sliceStart, sliceEnd);
  const rows: HexRow[] = [];
  const textLines: string[] = [];

  for (let i = 0; i < bytes.length; i += bytesPerRow) {
    const rowOffset = sliceStart + i;
    const rowEnd = Math.min(i + bytesPerRow, bytes.length);
    const rowBytes = bytes.subarray(i, rowEnd);

    const offsetFormatted = rowOffset.toString(16).padStart(offsetWidth, "0").toUpperCase();
    const hexFormatted = bytesToHex(rowBytes, { uppercase, separator: " " });
    const asciiFormatted = bytesToAscii(rowBytes, { nonPrintableChar: nonPrintable });

    // Pad hexFormatted if row has fewer than bytesPerRow
    const paddedHex = hexFormatted.padEnd(bytesPerRow * 3 - 1, " ");

    rows.push({
      offset: rowOffset,
      offsetFormatted,
      hexFormatted,
      asciiFormatted,
      bytes: rowBytes,
    });

    let line = "";
    if (showOffset) {
      line += `${offsetFormatted}  `;
    }
    line += paddedHex;
    if (showAscii) {
      line += `  ${asciiFormatted}`;
    }
    textLines.push(line);
  }

  return {
    rows,
    totalBytes: bytes.length,
    formatted: textLines.join("\n"),
  };
}
