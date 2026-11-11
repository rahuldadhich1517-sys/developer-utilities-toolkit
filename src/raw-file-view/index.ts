import { ValidationError } from "../shared/errors.js";
import type {
  BomInfo,
  DetectedEncoding,
  DetectedLineEnding,
  InspectRawFileOptions,
  LineEndingStats,
  RawFileInspectionResult,
} from "./types.js";

export * from "./types.js";

function toUint8Array(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new ValidationError("Input must be a Uint8Array or ArrayBuffer");
}

/**
 * Detects the presence of Byte Order Mark (BOM) in raw bytes.
 */
export function detectBom(bytes: Uint8Array): BomInfo {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { hasBom: true, type: "UTF-8", length: 3 };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { hasBom: true, type: "UTF-16LE", length: 2 };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { hasBom: true, type: "UTF-16BE", length: 2 };
  }
  return { hasBom: false, length: 0 };
}

/**
 * Checks whether the byte sequence exhibits characteristics of a binary file.
 */
function isBinaryData(bytes: Uint8Array, encoding: DetectedEncoding): boolean {
  if (bytes.length === 0) return false;
  if (encoding === "UTF-16LE" || encoding === "UTF-16BE") {
    // In UTF-16, null bytes are expected
    return false;
  }

  const sampleLen = Math.min(bytes.length, 8192);
  let nullBytes = 0;
  let controlChars = 0;

  for (let i = 0; i < sampleLen; i++) {
    const b = bytes[i]!;
    if (b === 0x00) {
      nullBytes++;
    } else if ((b < 0x09 || (b > 0x0d && b < 0x20)) && b !== 0x1b) {
      controlChars++;
    }
  }

  if (nullBytes > 0) return true;
  return controlChars / sampleLen > 0.05;
}

/**
 * Detects the text encoding of the provided byte buffer.
 */
export function detectFileEncoding(input: Uint8Array | ArrayBuffer): DetectedEncoding {
  const bytes = toUint8Array(input);
  if (bytes.length === 0) return "UTF-8";

  const bom = detectBom(bytes);
  if (bom.hasBom) {
    if (bom.type === "UTF-8") return "UTF-8-BOM";
    if (bom.type === "UTF-16LE") return "UTF-16LE";
    if (bom.type === "UTF-16BE") return "UTF-16BE";
  }

  if (isBinaryData(bytes, "UNKNOWN")) {
    return "BINARY";
  }

  // Check if pure 7-bit ASCII
  let isPureAscii = true;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i]! > 127) {
      isPureAscii = false;
      break;
    }
  }
  if (isPureAscii) return "ASCII";

  // Validate UTF-8
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
    return "UTF-8";
  } catch {
    return "UNKNOWN";
  }
}

/**
 * Detects line-ending styles and collects frequency statistics from text or raw bytes.
 */
export function detectLineEndings(input: string | Uint8Array | ArrayBuffer): {
  detectedLineEnding: DetectedLineEnding;
  stats: LineEndingStats;
} {
  let str: string;
  if (typeof input === "string") {
    str = input;
  } else {
    const bytes = toUint8Array(input);
    str = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
  }

  let crlf = 0;
  let lf = 0;
  let cr = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\r") {
      if (str[i + 1] === "\n") {
        crlf++;
        i++; // skip \n
      } else {
        cr++;
      }
    } else if (ch === "\n") {
      lf++;
    }
  }

  const typesCount = (crlf > 0 ? 1 : 0) + (lf > 0 ? 1 : 0) + (cr > 0 ? 1 : 0);

  let detectedLineEnding: DetectedLineEnding = "none";
  if (typesCount === 0) {
    detectedLineEnding = "none";
  } else if (typesCount > 1) {
    detectedLineEnding = "mixed";
  } else if (crlf > 0) {
    detectedLineEnding = "CRLF";
  } else if (lf > 0) {
    detectedLineEnding = "LF";
  } else if (cr > 0) {
    detectedLineEnding = "CR";
  }

  return {
    detectedLineEnding,
    stats: { crlf, lf, cr },
  };
}

/**
 * Decodes file content according to its detected encoding, stripping BOM if present.
 */
export function decodeFileContent(
  input: Uint8Array | ArrayBuffer,
  encoding?: DetectedEncoding
): { content: string; warnings: string[] } {
  const bytes = toUint8Array(input);
  const warnings: string[] = [];
  if (bytes.length === 0) return { content: "", warnings };

  const bom = detectBom(bytes);
  const enc = encoding ?? detectFileEncoding(bytes);

  const offset = bom.hasBom ? bom.length : 0;
  const contentBytes = bytes.subarray(offset);

  let decoderEncoding = "utf-8";
  if (enc === "UTF-16LE") decoderEncoding = "utf-16le";
  else if (enc === "UTF-16BE") decoderEncoding = "utf-16be";

  try {
    const decoder = new TextDecoder(decoderEncoding, { fatal: false });
    const content = decoder.decode(contentBytes);
    return { content, warnings };
  } catch (err) {
    warnings.push(`Decoding error with ${decoderEncoding}: ${err instanceof Error ? err.message : String(err)}`);
    const fallback = new TextDecoder("latin1").decode(contentBytes);
    return { content: fallback, warnings };
  }
}

/**
 * Inspects raw file bytes to determine encoding, BOM, line-ending styles, binary status, and content preview.
 */
export function inspectRawFile(
  input: Uint8Array | ArrayBuffer,
  options?: InspectRawFileOptions
): RawFileInspectionResult {
  const bytes = toUint8Array(input);
  const fileSize = bytes.length;
  const warnings: string[] = [];

  const bom = detectBom(bytes);
  const detectedEncoding = detectFileEncoding(bytes);
  const isBinary = detectedEncoding === "BINARY" || isBinaryData(bytes, detectedEncoding);

  if (isBinary) {
    warnings.push("File appears to contain binary data or null bytes.");
  }

  if (detectedEncoding === "UNKNOWN") {
    warnings.push("File encoding could not be determined with certainty. Ambiguous legacy encoding.");
  }

  const maxPreviewBytes = options?.maxPreviewBytes ?? 1024 * 64;
  const previewSlice = bytes.subarray(0, Math.min(bytes.length, maxPreviewBytes));

  const shouldDecode = options?.decodeContent ?? true;
  let decodedContent: string | undefined;

  if (shouldDecode) {
    const decoded = decodeFileContent(previewSlice, detectedEncoding);
    decodedContent = decoded.content;
    warnings.push(...decoded.warnings);
  }

  const { detectedLineEnding, stats: lineEndingCounts } = detectLineEndings(
    decodedContent ?? previewSlice
  );

  if (detectedLineEnding === "mixed") {
    warnings.push("File contains mixed line endings (CRLF, LF, and/or CR).");
  }

  return {
    fileSize,
    detectedEncoding,
    bom,
    detectedLineEnding,
    lineEndingCounts,
    isBinary,
    decodedContent,
    warnings,
  };
}
