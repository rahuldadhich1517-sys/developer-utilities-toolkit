export type DetectedEncoding =
  | "UTF-8"
  | "UTF-8-BOM"
  | "UTF-16LE"
  | "UTF-16BE"
  | "ASCII"
  | "BINARY"
  | "UNKNOWN";

export type DetectedLineEnding = "CRLF" | "LF" | "CR" | "mixed" | "none";

export interface LineEndingStats {
  crlf: number;
  lf: number;
  cr: number;
}

export interface BomInfo {
  hasBom: boolean;
  type?: "UTF-8" | "UTF-16LE" | "UTF-16BE";
  length: number;
}

export interface RawFileInspectionResult {
  fileSize: number;
  detectedEncoding: DetectedEncoding;
  bom: BomInfo;
  detectedLineEnding: DetectedLineEnding;
  lineEndingCounts: LineEndingStats;
  isBinary: boolean;
  decodedContent?: string;
  warnings: string[];
}

export interface InspectRawFileOptions {
  maxPreviewBytes?: number; // Limit decoded content size (e.g. 100KB)
  decodeContent?: boolean; // Default true
}
