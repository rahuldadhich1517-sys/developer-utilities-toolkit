import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  unescapeHtml,
} from "../../src/shared/html-escape.js";
import {
  assertNonEmptyString,
  assertNumber,
  assertString,
  assertUint8Array,
  clamp,
  isObject,
} from "../../src/shared/validation.js";
import {
  decodeBase64,
  encodeBase64,
  utf8BytesToString,
} from "../../src/shared/encoding.js";
import { ValidationError } from "../../src/shared/errors.js";

describe("shared helpers coverage", () => {
  it("escapes and unescapes HTML strings completely", () => {
    const raw = `<div>Hello & "World" 'test'</div>`;
    const escaped = escapeHtml(raw);
    expect(escaped).toBe("&lt;div&gt;Hello &amp; &quot;World&quot; &#39;test&#39;&lt;/div&gt;");
    const unescaped = unescapeHtml(escaped);
    expect(unescaped).toBe(raw);
  });

  it("validates types and boundaries with validation utilities", () => {
    expect(() => assertString(123)).toThrow(ValidationError);
    expect(() => assertNonEmptyString("   ")).toThrow(ValidationError);
    expect(() => assertNumber("not a number")).toThrow(ValidationError);
    expect(() => assertNumber(NaN)).toThrow(ValidationError);

    expect(isObject({})).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject([])).toBe(false);

    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);

    const u8 = new Uint8Array([1, 2, 3]);
    expect(() => assertUint8Array(u8)).not.toThrow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => assertUint8Array([1, 2, 3] as any)).toThrow(ValidationError);
  });

  it("handles base64 padding edges and invalid UTF-8 bytes", () => {
    // 1 byte, 2 bytes, 3 bytes
    const b1 = new Uint8Array([65]);
    const b2 = new Uint8Array([65, 66]);
    const b3 = new Uint8Array([65, 66, 67]);

    expect(decodeBase64(encodeBase64(b1))).toEqual(b1);
    expect(decodeBase64(encodeBase64(b2))).toEqual(b2);
    expect(decodeBase64(encodeBase64(b3))).toEqual(b3);

    const invalidUtf8 = new Uint8Array([0xff, 0xff]);
    expect(() => utf8BytesToString(invalidUtf8)).toThrow(ValidationError);
  });
});
