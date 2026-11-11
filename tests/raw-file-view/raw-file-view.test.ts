import { describe, expect, it } from "vitest";
import {
  decodeFileContent,
  detectBom,
  detectFileEncoding,
  detectLineEndings,
  inspectRawFile,
} from "../../src/raw-file-view/index.js";

describe("raw-file-view utility", () => {
  it("detects Byte Order Mark (BOM) for UTF-8, UTF-16LE, and UTF-16BE", () => {
    const utf8Bom = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x62]);
    expect(detectBom(utf8Bom)).toEqual({ hasBom: true, type: "UTF-8", length: 3 });

    const utf16leBom = new Uint8Array([0xff, 0xfe, 0x61, 0x00]);
    expect(detectBom(utf16leBom)).toEqual({ hasBom: true, type: "UTF-16LE", length: 2 });

    const utf16beBom = new Uint8Array([0xfe, 0xff, 0x00, 0x61]);
    expect(detectBom(utf16beBom)).toEqual({ hasBom: true, type: "UTF-16BE", length: 2 });

    const noBom = new Uint8Array([0x61, 0x62]);
    expect(detectBom(noBom).hasBom).toBe(false);
  });

  it("detects encoding (ASCII, UTF-8, UTF-8-BOM, BINARY)", () => {
    const ascii = new TextEncoder().encode("Plain ASCII string");
    expect(detectFileEncoding(ascii)).toBe("ASCII");

    const utf8 = new TextEncoder().encode("Unicode: 🚀 café");
    expect(detectFileEncoding(utf8)).toBe("UTF-8");

    const utf8Bom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]);
    expect(detectFileEncoding(utf8Bom)).toBe("UTF-8-BOM");

    const binary = new Uint8Array([0x48, 0x00, 0x00, 0x01, 0x02]);
    expect(detectFileEncoding(binary)).toBe("BINARY");
  });

  it("detects line endings (CRLF, LF, CR, mixed, none)", () => {
    expect(detectLineEndings("line1\r\nline2\r\nline3").detectedLineEnding).toBe("CRLF");
    expect(detectLineEndings("line1\nline2\nline3").detectedLineEnding).toBe("LF");
    expect(detectLineEndings("line1\rline2\rline3").detectedLineEnding).toBe("CR");
    expect(detectLineEndings("line1\r\nline2\nline3").detectedLineEnding).toBe("mixed");
    expect(detectLineEndings("single line no newline").detectedLineEnding).toBe("none");
  });

  it("decodes file content stripping BOM cleanly", () => {
    const raw = new Uint8Array([0xef, 0xbb, 0xbf, 0x48, 0x69]);
    const { content } = decodeFileContent(raw);
    expect(content).toBe("Hi");
  });

  it("inspects raw file completely returning metadata, encoding, stats, and preview", () => {
    const text = "Hello World\r\nSecond Line\r\n";
    const bytes = new TextEncoder().encode(text);
    const result = inspectRawFile(bytes);

    expect(result.fileSize).toBe(bytes.length);
    expect(result.detectedEncoding).toBe("ASCII");
    expect(result.detectedLineEnding).toBe("CRLF");
    expect(result.lineEndingCounts.crlf).toBe(2);
    expect(result.isBinary).toBe(false);
    expect(result.decodedContent).toBe(text);
  });

  it("handles empty files gracefully", () => {
    const empty = new Uint8Array(0);
    const result = inspectRawFile(empty);
    expect(result.fileSize).toBe(0);
    expect(result.detectedLineEnding).toBe("none");
    expect(result.isBinary).toBe(false);
  });
});
