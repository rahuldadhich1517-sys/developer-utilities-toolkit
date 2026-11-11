# @rahul_dadhich15/developer-utilities-toolkit

A modular, zero-dependency, browser-first developer utilities toolkit for modern web applications, developer platforms, and client-side web tools.

[![npm version](https://img.shields.io/npm/v/@rahul_dadhich15/developer-utilities-toolkit.svg)](https://www.npmjs.com/package/@rahul_dadhich15/developer-utilities-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![Coverage](https://img.shields.io/badge/coverage-90%25%2B-success.svg)](vitest.config.ts)

---

## Highlights

- **Zero Runtime Dependencies**: Zero external runtime dependencies. Zero supply-chain vulnerabilities.
- **Browser-First Architecture**: Built specifically for client-side web applications and browser devtools (e.g. React, Vite, Vue, Svelte), requiring no server backend.
- **Universal JavaScript**: Dual ESM & CommonJS builds with full TypeScript declarations (`.d.ts` and `.d.cts`).
- **Tree-Shakeable & Modular**: Import everything from root or use granular subpath exports for minimal bundle footprint.
- **Strict Security Guarantees**: Pure functions, no `eval()`, no dynamic code execution, safe HTML escaping, and strict Content Security Policy defaults.

---

## Installation

```bash
npm install @rahul_dadhich15/developer-utilities-toolkit
```

Or using pnpm / yarn:

```bash
pnpm add @rahul_dadhich15/developer-utilities-toolkit
# or
yarn add @rahul_dadhich15/developer-utilities-toolkit
```

---

## Modular Subpath Exports

In addition to importing from the root package, you can import individual utilities directly:

```ts
import { colorizeAnsi } from "@rahul_dadhich15/developer-utilities-toolkit/ansi-color";
import { cssSelectorToXPath } from "@rahul_dadhich15/developer-utilities-toolkit/selector-to-xpath";
import { extractEmails } from "@rahul_dadhich15/developer-utilities-toolkit/email-extract";
import { formatHexView } from "@rahul_dadhich15/developer-utilities-toolkit/hex-view";
import { createHtmlPreviewDocument } from "@rahul_dadhich15/developer-utilities-toolkit/html-live-edit";
import { getKeyEventInfo } from "@rahul_dadhich15/developer-utilities-toolkit/keycode-find";
import { validateLua } from "@rahul_dadhich15/developer-utilities-toolkit/lua-validate";
import { createShareableSnippetUrl } from "@rahul_dadhich15/developer-utilities-toolkit/pastebin";
import { inspectRawFile } from "@rahul_dadhich15/developer-utilities-toolkit/raw-file-view";
import { parseStackTrace } from "@rahul_dadhich15/developer-utilities-toolkit/stack-trace-parse";
import { evaluateXPath } from "@rahul_dadhich15/developer-utilities-toolkit/xpath-test";
import { createPreviewIframeAttributes } from "@rahul_dadhich15/developer-utilities-toolkit/browser";
```

---

## The 11 Utilities Overview & APIs

### 1. `pastebin`
Create and share code snippets via URL fragments or external storage adapters.

**APIs:**
- `createSnippetPayload(options: CreateSnippetOptions): SnippetPayload`
- `encodeSnippet(payload: SnippetPayload): string`
- `decodeSnippet(encoded: string): SnippetPayload`
- `createShareableSnippetUrl(payload: SnippetPayload, options?: ShareableSnippetUrlOptions): string`
- `createPastebinClient(adapter?: PastebinStorageAdapter): PastebinClient`

**Two Operating Modes:**
- **Mode A (Local URL Sharing)**: Encodes snippet payload into the URL fragment (`#snippet=...`). Zero data is sent to any server. Perfect for static sites.
  - *URL Length Warning*: Standard browsers support URLs up to 8,192 characters. For larger snippets, use Mode B.
- **Mode B (External Storage Adapter)**: Connect your own backend or storage provider via `createPastebinClient({ publishSnippet, getSnippet })`. The toolkit makes zero network requests automatically.

```ts
import { createSnippetPayload, createShareableSnippetUrl, decodeSnippet } from "@rahul_dadhich15/developer-utilities-toolkit/pastebin";

const snippet = createSnippetPayload({
  title: "Example Function",
  language: "typescript",
  content: "export const add = (a: number, b: number) => a + b;",
});

const shareUrl = createShareableSnippetUrl(snippet, { baseUrl: "https://mytools.dev/paste" });
// Open URL and decode:
const decoded = decodeSnippet(shareUrl.split("#snippet=")[1]);
```

---

### 2. `ansi-color`
ANSI terminal styling, color formatting, safe stripping, and safe HTML rendering.

**APIs:**
- `ansiColor(color: ColorInput): string`
- `ansiBackground(color: ColorInput): string`
- `ansiStyle(style: AnsiStyleName): string`
- `colorizeAnsi(text: string, options: AnsiFormatOptions): string`
- `stripAnsi(text: string): string`
- `supportsAnsiColor(): boolean`
- `ansiToHtml(text: string, options?: AnsiToHtmlOptions): string`

**Features:**
- Standard colors, bright colors, 256-color palette (`38;5;n`), truecolor RGB (`38;2;r;g;b`), and Hex `#RRGGBB`.
- `ansiToHtml()` strictly escapes HTML special characters (`<`, `>`, `&`, `"`, `'`) to prevent XSS.

```ts
import { colorizeAnsi, ansiToHtml, stripAnsi } from "@rahul_dadhich15/developer-utilities-toolkit/ansi-color";

const ansi = colorizeAnsi("Success", { color: "green", style: "bold" });
const clean = stripAnsi(ansi); // "Success"
const html = ansiToHtml(ansi); // "<span style=\"font-weight:bold;\"><span style=\"color:#0dbc79;\">Success</span></span>"
```

---

### 3. `selector-to-xpath`
Converts CSS selectors to XPath 1.0 expressions using a genuine lexical parser.

**APIs:**
- `cssSelectorToXPath(selector: string, options?: SelectorToXPathOptions): string`
- `convertSelectorListToXPath(selectors: string[] | string): string`
- `validateCssSelector(selector: string): { valid: boolean; error?: string }`
- `getSupportedSelectorFeatures(): SupportedSelectorFeatures`

**Supported Features:**
- Tags (`div`), universal (`*`), IDs (`#id`), classes (`.class`).
- Attributes: `[attr]`, `[attr=val]`, `[attr^=val]`, `[attr$=val]`, `[attr*=val]`, `[attr~=val]`.
- Combinators: descendant (` `), child (`>`), adjacent sibling (`+`), general sibling (`~`).
- Selector groups (`,`).
- Pseudo-classes: `:first-child`, `:last-child`, `:nth-child()`, `:nth-of-type()`, `:not()`, `:empty`.
- Safe XPath string literal escaping with `concat()` for mixed quote handling.

```ts
import { cssSelectorToXPath } from "@rahul_dadhich15/developer-utilities-toolkit/selector-to-xpath";

cssSelectorToXPath("article.blog-post > h2:first-child");
// Returns: "//article[contains(concat(' ', normalize-space(@class), ' '), ' blog-post ')]/h2[not(preceding-sibling::*)]"
```

---

### 4. `email-extract`
Extracts, deduplicates, and normalizes email addresses from raw text safely.

**APIs:**
- `extractEmails(text: string, options?: EmailExtractOptions): ExtractedEmail[]`
- `extractUniqueEmails(text: string, options?: EmailExtractOptions): ExtractedEmail[]`
- `validateExtractedEmail(candidate: string): { valid: boolean; reason?: string }`
- `normalizeEmail(email: string, options?: NormalizeEmailOptions): string`

**Features:**
- Non-backtracking regular expression engine (immune to ReDoS).
- Preserves source start/end offsets and original raw matched text.
- Strips trailing prose punctuation (`.`, `!`, `?`).
- Domain filtering (`allowedDomains`, `blockedDomains`) and case normalization.

```ts
import { extractEmails } from "@rahul_dadhich15/developer-utilities-toolkit/email-extract";

const text = "Contact support@toolkit.dev or hello@toolkit.dev.";
const results = extractEmails(text);
// [{ email: "support@toolkit.dev", start: 8, end: 27, domain: "toolkit.dev", localPart: "support" }, ...]
```

---

### 5. `hex-view`
Formats raw binary buffers into structured hexadecimal views with an ASCII gutter.

**APIs:**
- `formatHexView(input: Uint8Array | ArrayBuffer, options?: HexViewOptions): HexViewResult`
- `bytesToHex(input: Uint8Array | ArrayBuffer, options?: BytesToHexOptions): string`
- `bytesToAscii(input: Uint8Array | ArrayBuffer, options?: BytesToAsciiOptions): string`
- `parseHexString(hexString: string): Uint8Array`

```ts
import { formatHexView } from "@rahul_dadhich15/developer-utilities-toolkit/hex-view";

const data = new TextEncoder().encode("Hello World");
const result = formatHexView(data, { bytesPerRow: 8 });
console.log(result.formatted);
// 00000000  48 65 6C 6C 6F 20 57 6F  Hello Wo
// 00000008  72 6C 64                 rld
```

---

### 6. `html-live-edit`
Generates live HTML preview documents with strict security defaults for iframe embedding.

**APIs:**
- `createHtmlPreviewDocument(options: HtmlLiveEditOptions): PreviewDocumentResult`
- `createHtmlDocument(options: HtmlLiveEditOptions): string`
- `validateHtmlInput(html: string): HtmlValidationResult`
- `createPreviewOptions(overrides?: Partial<HtmlLiveEditOptions>): HtmlLiveEditOptions`

**Security Measures:**
- Scripts disabled by default (`allowScripts: false`).
- Generates strict `Content-Security-Policy` (`default-src 'none'`).
- Strictly prohibits `allow-same-origin` in preview sandboxes to prevent parent frame and cookie access.

```ts
import { createHtmlPreviewDocument } from "@rahul_dadhich15/developer-utilities-toolkit/html-live-edit";

const preview = createHtmlPreviewDocument({
  html: "<h1>Live Preview</h1>",
  css: "h1 { color: purple; }",
  allowScripts: false,
});
// Use preview.documentHtml in your iframe srcdoc attribute
```

---

### 7. `keycode-find`
Normalized keyboard event inspector exposing standard codes, categories, and shortcut strings.

**APIs:**
- `getKeyEventInfo(event: PartialKeyboardEvent): NormalizedKeyEvent`
- `normalizeKeyboardEvent(event: PartialKeyboardEvent): NormalizedKeyEvent`
- `getKeyboardCode(key: string): string`
- `getModifierState(event: PartialKeyboardEvent, modifier: string): boolean`

```ts
import { getKeyEventInfo } from "@rahul_dadhich15/developer-utilities-toolkit/keycode-find";

window.addEventListener("keydown", (e) => {
  const info = getKeyEventInfo(e);
  console.log(info.shortcut); // e.g. "Ctrl+Shift+P"
  console.log(info.category); // "letter", "function", "navigation", etc.
});
```

---

### 8. `lua-validate`
Validates Lua source code syntax using a genuine Lua 5.4 recursive-descent parser.

**APIs:**
- `validateLua(source: string): LuaValidationResult`
- `tokenizeLua(source: string): LuaToken[]`
- `parseLua(source: string): LuaAstNode`
- `getLuaSyntaxVersion(): string`

**Features:**
- Lua 5.4 grammar (keywords, numbers, hex floats, long comments, long strings, tables, function declarations, local attributes `<const>` and `<close>`, goto/labels, control structures).
- Line/column position tracking and recursion depth limit protection.

```ts
import { validateLua } from "@rahul_dadhich15/developer-utilities-toolkit/lua-validate";

const result = validateLua("local x <const> = 10\nprint(x)");
if (!result.valid) {
  console.error("Syntax error:", result.errors[0]?.message);
}
```

---

### 9. `raw-file-view`
Inspects raw byte buffers to detect encodings, BOM markers, line endings, and binary files.

**APIs:**
- `inspectRawFile(input: Uint8Array | ArrayBuffer, options?: InspectRawFileOptions): RawFileInspectionResult`
- `detectFileEncoding(input: Uint8Array | ArrayBuffer): DetectedEncoding`
- `detectLineEndings(input: string | Uint8Array | ArrayBuffer): { detectedLineEnding: DetectedLineEnding; stats: LineEndingStats }`
- `decodeFileContent(input: Uint8Array | ArrayBuffer, encoding?: DetectedEncoding): { content: string; warnings: string[] }`

**Features:**
- BOM detection: UTF-8 BOM (`0xEF, 0xBB, 0xBF`), UTF-16 LE (`0xFF, 0xFE`), UTF-16 BE (`0xFE, 0xFF`).
- Line-ending analytics: CRLF, LF, CR, mixed.
- Binary heuristics based on null bytes and control code density.

```ts
import { inspectRawFile } from "@rahul_dadhich15/developer-utilities-toolkit/raw-file-view";

const inspection = inspectRawFile(fileBytes);
console.log(inspection.detectedEncoding); // "UTF-8", "ASCII", "BINARY", etc.
console.log(inspection.detectedLineEnding); // "CRLF", "LF", "mixed"
```

---

### 10. `stack-trace-parse`
Parses and standardizes JavaScript stack trace frames from V8, Firefox, Safari, and Node.

**APIs:**
- `parseStackTrace(input: string | Error): ParsedStackTrace`
- `parseStackFrame(line: string): StackFrame | null`
- `formatStackTrace(input: ParsedStackTrace | StackFrame[], options?: FormatStackTraceOptions): string`

**Features:**
- Parses Windows paths (`C:\...`), Unix paths, file URLs, and http(s) URLs.
- Identifies function names, line numbers, column numbers, async frames, and native code.

```ts
import { parseStackTrace } from "@rahul_dadhich15/developer-utilities-toolkit/stack-trace-parse";

const parsed = parseStackTrace(error);
console.log(parsed.frames[0]?.functionName, parsed.frames[0]?.lineNumber);
```

---

### 11. `xpath-test`
Evaluates and validates XPath 1.0 queries against DOM Documents using native browser APIs.

**APIs:**
- `evaluateXPath(expression: string, options?: EvaluateXPathOptions): XPathEvaluationResult`
- `validateXPath(expression: string, doc?: Document): { valid: boolean; error?: string }`
- `formatXPathResult(result: XPathEvaluationResult): string`
- `queryXPathNodes(expression: string, options?: EvaluateXPathOptions): Node[]`
- `parseXmlDocument(xmlString: string, domParserInstance?: unknown): Document`
- `parseHtmlDocument(htmlString: string, domParserInstance?: unknown): Document`

```ts
import { evaluateXPath, parseXmlDocument } from "@rahul_dadhich15/developer-utilities-toolkit/xpath-test";

const xmlDoc = parseXmlDocument("<bookstore><book title='Toolkit' price='20'/></bookstore>");
const result = evaluateXPath("//book/@title", { document: xmlDoc });
console.log(result.formattedValues); // ['@title="Toolkit"']
```

---

## Browser Integration (React & Vite)

This toolkit was designed specifically to integrate effortlessly into client-side single-page applications without a backend:

```tsx
import React, { useState } from "react";
import {
  createHtmlPreviewDocument,
  formatHexView,
  validateLua,
} from "@rahul_dadhich15/developer-utilities-toolkit";
import { createPreviewIframeAttributes } from "@rahul_dadhich15/developer-utilities-toolkit/browser";

export function LivePreviewComponent({ htmlCode, cssCode }: { htmlCode: string; cssCode: string }) {
  const preview = createHtmlPreviewDocument({
    html: htmlCode,
    css: cssCode,
    allowScripts: false, // Keep disabled for untrusted input
  });

  const iframeProps = createPreviewIframeAttributes(preview);

  return (
    <iframe
      title="Sandboxed Preview"
      {...iframeProps}
      style={{ width: "100%", height: "400px", border: "1px solid #ccc" }}
    />
  );
}
```

---

## Security Considerations

- **Untrusted Input**: Treat all user input as untrusted.
- **No Dynamic Code Execution**: This package contains zero `eval()` or `new Function()` invocations.
- **Iframe Sandboxes**: Always sandbox user-submitted preview HTML. The toolkit's `createHtmlPreviewDocument` defaults to strict CSP and rejects `allow-same-origin`.
- **Large Inputs**: All tokenizers and parsers feature recursion limits (`MAX_RECURSION_DEPTH`) and non-backtracking regular expressions.

---

## Development & Testing

```bash
# Install dependencies
npm install

# Typecheck with TypeScript
npm run typecheck

# Lint with ESLint
npm run lint

# Run all unit tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run ESM and CommonJS smoke tests
npm run test:smoke

# Run tarball consumer verification
npm run test:consumer

# Build ESM, CJS and .d.ts outputs
npm run build
```

---

## License

[MIT](LICENSE) © Rahul Dadhich
