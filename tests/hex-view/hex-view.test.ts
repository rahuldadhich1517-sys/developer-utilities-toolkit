import { describe, expect, it } from "vitest";
import {
  bytesToAscii,
  bytesToHex,
  formatHexView,
  parseHexString,
} from "../../src/hex-view/index.js";
import { ValidationError } from "../../src/shared/errors.js";

describe("hex-view utility", () => {
  it("converts bytes to hexadecimal string", () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(bytesToHex(bytes)).toBe("48 65 6C 6C 6F");
    expect(bytesToHex(bytes, { uppercase: false, separator: "-" })).toBe("48-65-6c-6c-6f");
    expect(bytesToHex(bytes.buffer)).toBe("48 65 6C 6C 6F");
  });

  it("converts bytes to ASCII gutter replacing non-printables", () => {
    const bytes = new Uint8Array([0x48, 0x00, 0x69, 0xff, 0x21]);
    expect(bytesToAscii(bytes)).toBe("H.i.!");
    expect(bytesToAscii(bytes, { nonPrintableChar: "?" })).toBe("H?i?!");
  });

  it("parses arbitrary hex strings into Uint8Array", () => {
    const parsed1 = parseHexString("48 65 6C 6C 6F");
    expect(Array.from(parsed1)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

    const parsed2 = parseHexString("0x48, 0x65, 0x6C");
    expect(Array.from(parsed2)).toEqual([0x48, 0x65, 0x6c]);

    expect(() => parseHexString("486")).toThrow(ValidationError); // odd length
    expect(() => parseHexString("48ZZ")).toThrow(ValidationError); // invalid chars
  });

  it("formats structured hex view table with offset, hex bytes, and ASCII gutter", () => {
    // "Hello World" -> 11 bytes
    const bytes = new TextEncoder().encode("Hello World");
    const result = formatHexView(bytes, { bytesPerRow: 8 });

    expect(result.rows).toHaveLength(2);
    expect(result.totalBytes).toBe(11);
    expect(result.rows[0]!.offsetFormatted).toBe("00000000");
    expect(result.rows[0]!.asciiFormatted).toBe("Hello Wo");
    expect(result.rows[1]!.offsetFormatted).toBe("00000008");
    expect(result.rows[1]!.asciiFormatted).toBe("rld");

    const lines = result.formatted.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("00000000");
    expect(lines[0]).toContain("48 65 6C 6C 6F 20 57 6F");
    expect(lines[0]).toContain("Hello Wo");
  });

  it("handles pagination / startOffset and maxBytes", () => {
    const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const res = formatHexView(data, { startOffset: 4, maxBytes: 4, bytesPerRow: 4 });

    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.offset).toBe(4);
    expect(res.totalBytes).toBe(4);
  });

  it("handles empty input buffers safely", () => {
    const empty = new Uint8Array(0);
    const res = formatHexView(empty);
    expect(res.rows).toHaveLength(0);
    expect(res.totalBytes).toBe(0);
    expect(res.formatted).toBe("");
  });

  it("throws on invalid parameters", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => formatHexView("not bytes" as any)).toThrow(ValidationError);
    expect(() => formatHexView(new Uint8Array(5), { bytesPerRow: 0 })).toThrow(ValidationError);
  });
});
