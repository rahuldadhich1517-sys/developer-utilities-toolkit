export interface HexViewOptions {
  bytesPerRow?: number; // default 16
  offsetWidth?: number; // default 8 hex chars
  startOffset?: number; // default 0
  maxBytes?: number; // limit formatted output length
  nonPrintableChar?: string; // default "."
  uppercase?: boolean; // default true
  showOffset?: boolean; // default true
  showAscii?: boolean; // default true
  groupSeparator?: string; // space between hex bytes, default " "
}

export interface HexRow {
  offset: number;
  offsetFormatted: string;
  hexFormatted: string;
  asciiFormatted: string;
  bytes: Uint8Array;
}

export interface HexViewResult {
  rows: HexRow[];
  totalBytes: number;
  formatted: string;
}

export interface BytesToHexOptions {
  separator?: string; // default " "
  uppercase?: boolean; // default true
}

export interface BytesToAsciiOptions {
  nonPrintableChar?: string; // default "."
}
