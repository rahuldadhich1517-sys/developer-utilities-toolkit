import {
  DEFAULT_MAX_CONTENT_SIZE,
  DEFAULT_URL_LENGTH_LIMIT,
} from "../shared/constants.js";
import {
  ConfigurationError,
  ValidationError,
} from "../shared/errors.js";
import {
  decodeBase64Url,
  encodeBase64Url,
  stringToUtf8Bytes,
  utf8BytesToString,
} from "../shared/encoding.js";
import { assertNonEmptyString, assertString } from "../shared/validation.js";
import type {
  CreateSnippetOptions,
  PastebinClient,
  PastebinStorageAdapter,
  ShareableSnippetUrlOptions,
  SnippetPayload,
} from "./types.js";

export * from "./types.js";

/**
 * Creates a validated snippet payload structure.
 */
export function createSnippetPayload(options: CreateSnippetOptions): SnippetPayload {
  if (!options || typeof options !== "object") {
    throw new ValidationError("Snippet options must be provided as an object");
  }

  assertString(options.content, "snippet content");

  const maxSize = options.maxContentSize ?? DEFAULT_MAX_CONTENT_SIZE;
  const contentBytes = stringToUtf8Bytes(options.content);

  if (contentBytes.length > maxSize) {
    throw new ValidationError(
      `Content size (${contentBytes.length} bytes) exceeds maximum allowed size (${maxSize} bytes)`
    );
  }

  let expiresAt: string | undefined;
  if (options.expiresAt !== undefined) {
    if (typeof options.expiresAt === "number") {
      expiresAt = new Date(options.expiresAt).toISOString();
    } else if (options.expiresAt instanceof Date) {
      expiresAt = options.expiresAt.toISOString();
    } else if (typeof options.expiresAt === "string") {
      const parsed = new Date(options.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new ValidationError("Invalid expiration date format");
      }
      expiresAt = parsed.toISOString();
    } else {
      throw new ValidationError("Invalid expiration date");
    }
  }

  return {
    title: options.title?.trim() || undefined,
    language: options.language?.trim().toLowerCase() || undefined,
    description: options.description?.trim() || undefined,
    content: options.content,
    createdAt: new Date().toISOString(),
    expiresAt,
    version: 1,
  };
}

/**
 * Encodes a snippet payload into a URL-safe Base64 string.
 */
export function encodeSnippet(payload: SnippetPayload): string {
  if (!payload || typeof payload !== "object" || typeof payload.content !== "string") {
    throw new ValidationError("Invalid snippet payload to encode");
  }

  const jsonStr = JSON.stringify(payload);
  const bytes = stringToUtf8Bytes(jsonStr);
  return encodeBase64Url(bytes);
}

/**
 * Decodes a URL-safe Base64 string back into a snippet payload.
 */
export function decodeSnippet(encoded: string): SnippetPayload {
  assertNonEmptyString(encoded, "encoded snippet string");

  try {
    const bytes = decodeBase64Url(encoded.trim());
    const jsonStr = utf8BytesToString(bytes);
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object" || typeof parsed.content !== "string") {
      throw new ValidationError("Decoded payload does not contain valid snippet data");
    }

    return {
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      language: typeof parsed.language === "string" ? parsed.language : undefined,
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      content: parsed.content,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
      expiresAt: typeof parsed.expiresAt === "string" ? parsed.expiresAt : undefined,
      version: typeof parsed.version === "number" ? parsed.version : 1,
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(`Failed to decode snippet: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Mode A: Creates a shareable snippet URL containing the payload in the URL fragment.
 * Does not send snippet contents to any remote server.
 */
export function createShareableSnippetUrl(
  payload: SnippetPayload,
  options?: ShareableSnippetUrlOptions
): string {
  const encoded = encodeSnippet(payload);
  const baseUrl = options?.baseUrl ?? "https://example.com/paste";
  const prefix = options?.fragmentPrefix ?? "snippet=";
  const maxUrlLength = options?.maxUrlLength ?? DEFAULT_URL_LENGTH_LIMIT;

  const url = `${baseUrl}#${prefix}${encoded}`;

  if (url.length > maxUrlLength) {
    throw new ValidationError(
      `Shareable URL length (${url.length} chars) exceeds URL length limit of ${maxUrlLength} chars. Snippet content is too large for URL-only storage.`
    );
  }

  return url;
}

/**
 * Mode B: Creates a provider-agnostic Pastebin client with user-injected storage adapter.
 * The package makes zero automatic network requests.
 */
export function createPastebinClient(adapter?: PastebinStorageAdapter): PastebinClient {
  if (!adapter || typeof adapter.publishSnippet !== "function" || typeof adapter.getSnippet !== "function") {
    throw new ConfigurationError(
      "Pastebin client requires an external storage adapter with publishSnippet and getSnippet methods. No central backend is configured by default."
    );
  }

  return {
    async publishSnippet(snippet: SnippetPayload) {
      return adapter.publishSnippet(snippet);
    },
    async getSnippet(id: string) {
      return adapter.getSnippet(id);
    },
  };
}
