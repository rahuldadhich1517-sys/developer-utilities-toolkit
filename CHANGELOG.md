# Changelog

All notable changes to `@rahul_dadhich15/developer-utilities-toolkit` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-11

### Initial Release

- **Zero Runtime Dependencies**: Completely standalone, zero third-party dependencies at runtime.
- **Dual Module Support**: Full ECMAScript Modules (ESM) and CommonJS (CJS) builds with `.d.ts` and `.d.cts` declarations.
- **Browser-First Architecture**: Pure utility functions with zero mandatory backend, no hidden network requests, and no filesystem requirements in core exports.
- **Modular Subpath Exports**: Granular imports for each utility to guarantee tree-shaking.
- **Implemented 11 Production Utilities**:
  1. `pastebin`: Local URL-fragment sharing and provider-agnostic external storage adapter.
  2. `ansi-color`: Terminal color escape sequences, 256-color, truecolor RGB, hex conversions, safe stripping, and safe HTML rendering.
  3. `selector-to-xpath`: CSS selector parser and converter to XPath 1.0 supporting elements, attributes, combinators, and pseudo-classes.
  4. `email-extract`: Non-backtracking email extraction with position tracking, duplicate removal, case normalization, and domain filtering.
  5. `hex-view`: Hexadecimal buffer viewer with ASCII gutter, configurable offsets, and row pagination.
  6. `html-live-edit`: Secure HTML preview generator with CSP directives, base styles, and iframe sandboxing.
  7. `keycode-find`: Keyboard event normalizer exposing key categorization, modifier combinations, and shortcut formatting.
  8. `lua-validate`: Genuine Lua 5.4 tokenizer and recursive-descent parser providing structured syntax error diagnostics.
  9. `raw-file-view`: File encoding inspection, BOM detection (UTF-8, UTF-16LE, UTF-16BE), binary detection, and line-ending analytics.
  10. `stack-trace-parse`: Universal JavaScript stack trace parser supporting V8, Chrome, Node.js, Firefox, and Safari formats.
  11. `xpath-test`: Document XPath evaluator and validator leveraging browser-native `DOMParser` and `XPathResult`.
