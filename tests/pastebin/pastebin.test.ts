import { describe, expect, it } from "vitest";
import {
  createPastebinClient,
  createShareableSnippetUrl,
  createSnippetPayload,
  decodeSnippet,
  encodeSnippet,
} from "../../src/pastebin/index.js";
import { ConfigurationError, ValidationError } from "../../src/shared/errors.js";

describe("pastebin utility", () => {
  it("creates a valid snippet payload with defaults and custom metadata", () => {
    const payload = createSnippetPayload({
      title: "  My Snippet  ",
      language: " TypeScript ",
      description: " A test snippet ",
      content: "console.log('hello world');",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });

    expect(payload.title).toBe("My Snippet");
    expect(payload.language).toBe("typescript");
    expect(payload.description).toBe("A test snippet");
    expect(payload.content).toBe("console.log('hello world');");
    expect(payload.expiresAt).toBe("2030-01-01T00:00:00.000Z");
    expect(payload.version).toBe(1);
    expect(typeof payload.createdAt).toBe("string");
  });

  it("handles expiresAt as Date and timestamp number", () => {
    const d = new Date(Date.now() + 100000);
    const p1 = createSnippetPayload({ content: "code", expiresAt: d });
    expect(p1.expiresAt).toBe(d.toISOString());

    const ts = Date.now() + 50000;
    const p2 = createSnippetPayload({ content: "code", expiresAt: ts });
    expect(p2.expiresAt).toBe(new Date(ts).toISOString());
  });

  it("throws ValidationError on invalid expiresAt format", () => {
    expect(() =>
      createSnippetPayload({ content: "code", expiresAt: "not-a-date" })
    ).toThrow(ValidationError);
    expect(() => createSnippetPayload({ content: "code", expiresAt: {} as Record<string, never> })).toThrow(
      ValidationError
    );
  });

  it("validates maximum content size", () => {
    expect(() =>
      createSnippetPayload({
        content: "A".repeat(20),
        maxContentSize: 10,
      })
    ).toThrow(ValidationError);
  });

  it("throws ValidationError when options or content is invalid", () => {
    expect(() => createSnippetPayload(null as unknown as Parameters<typeof createSnippetPayload>[0])).toThrow(
      ValidationError
    );
    expect(() => createSnippetPayload({} as Record<string, never>)).toThrow(ValidationError);
  });

  it("encodes and decodes snippet payload accurately (round-trip)", () => {
    const payload = createSnippetPayload({
      title: "Unicode test: 🚀 ñoño 日本語",
      language: "json",
      content: '{"greeting": "こんにちは"}',
    });

    const encoded = encodeSnippet(payload);
    expect(typeof encoded).toBe("string");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");

    const decoded = decodeSnippet(encoded);
    expect(decoded.title).toBe(payload.title);
    expect(decoded.language).toBe(payload.language);
    expect(decoded.content).toBe(payload.content);
  });

  it("throws on invalid snippet to encode or decode", () => {
    expect(() => encodeSnippet({} as Record<string, never>)).toThrow(ValidationError);
    expect(() => decodeSnippet("")).toThrow(ValidationError);
    expect(() => decodeSnippet("not valid base64 json !@#$")).toThrow(ValidationError);
  });

  it("creates shareable snippet URLs with custom baseUrl and fragment prefix", () => {
    const payload = createSnippetPayload({ content: "test code" });
    const url = createShareableSnippetUrl(payload, {
      baseUrl: "https://mytools.dev/paste",
      fragmentPrefix: "p=",
    });

    expect(url.startsWith("https://mytools.dev/paste#p=")).toBe(true);
    const fragment = url.split("#p=")[1]!;
    const decoded = decodeSnippet(fragment);
    expect(decoded.content).toBe("test code");
  });

  it("enforces URL length limit on shareable URLs", () => {
    const payload = createSnippetPayload({ content: "A".repeat(500) });
    expect(() =>
      createShareableSnippetUrl(payload, {
        maxUrlLength: 100,
      })
    ).toThrow(ValidationError);
  });

  it("Mode B: creates pastebin client with external storage adapter", async () => {
    const storage = new Map<string, { content: string }>();
    const client = createPastebinClient({
      async publishSnippet(snippet) {
        const id = "snippet-123";
        storage.set(id, snippet);
        return { id, url: `https://mybackend.dev/p/${id}` };
      },
      async getSnippet(id) {
        return storage.get(id);
      },
    });

    const payload = createSnippetPayload({ content: "adapter snippet" });
    const pub = await client.publishSnippet(payload);
    expect(pub.id).toBe("snippet-123");

    const fetched = await client.getSnippet("snippet-123");
    expect(fetched.content).toBe("adapter snippet");
  });

  it("Mode B: throws ConfigurationError when adapter is missing or incomplete", () => {
    expect(() => createPastebinClient()).toThrow(ConfigurationError);
    expect(() => createPastebinClient({} as Record<string, never>)).toThrow(ConfigurationError);
  });
});
