// Smoke test for CommonJS root and subpath exports
const Root = require("../dist/index.cjs");
const Pastebin = require("../dist/pastebin/index.cjs");
const AnsiColor = require("../dist/ansi-color/index.cjs");
const SelectorToXPath = require("../dist/selector-to-xpath/index.cjs");
const EmailExtract = require("../dist/email-extract/index.cjs");
const HexView = require("../dist/hex-view/index.cjs");
const HtmlLiveEdit = require("../dist/html-live-edit/index.cjs");
const KeycodeFind = require("../dist/keycode-find/index.cjs");
const LuaValidate = require("../dist/lua-validate/index.cjs");
const RawFileView = require("../dist/raw-file-view/index.cjs");
const StackTraceParse = require("../dist/stack-trace-parse/index.cjs");
const XPathTest = require("../dist/xpath-test/index.cjs");
const Browser = require("../dist/browser/index.cjs");

console.log("Testing CommonJS Root and Subpath Exports...");

if (typeof Root.createSnippetPayload !== "function") throw new Error("CJS Root.createSnippetPayload missing");
if (typeof Pastebin.createShareableSnippetUrl !== "function") throw new Error("CJS Pastebin.createShareableSnippetUrl missing");
if (typeof AnsiColor.colorizeAnsi !== "function") throw new Error("CJS AnsiColor.colorizeAnsi missing");
if (typeof SelectorToXPath.cssSelectorToXPath !== "function") throw new Error("CJS SelectorToXPath.cssSelectorToXPath missing");
if (typeof EmailExtract.extractEmails !== "function") throw new Error("CJS EmailExtract.extractEmails missing");
if (typeof HexView.formatHexView !== "function") throw new Error("CJS HexView.formatHexView missing");
if (typeof HtmlLiveEdit.createHtmlPreviewDocument !== "function") throw new Error("CJS HtmlLiveEdit.createHtmlPreviewDocument missing");
if (typeof KeycodeFind.getKeyEventInfo !== "function") throw new Error("CJS KeycodeFind.getKeyEventInfo missing");
if (typeof LuaValidate.validateLua !== "function") throw new Error("CJS LuaValidate.validateLua missing");
if (typeof RawFileView.inspectRawFile !== "function") throw new Error("CJS RawFileView.inspectRawFile missing");
if (typeof StackTraceParse.parseStackTrace !== "function") throw new Error("CJS StackTraceParse.parseStackTrace missing");
if (typeof XPathTest.evaluateXPath !== "function") throw new Error("CJS XPathTest.evaluateXPath missing");
if (typeof Browser.createPreviewIframeAttributes !== "function") throw new Error("CJS Browser.createPreviewIframeAttributes missing");

// Run sample operations
const snippet = Pastebin.createSnippetPayload({ content: "cjs test" });
if (snippet.content !== "cjs test") throw new Error("CJS snippet failed");

const stripped = AnsiColor.stripAnsi("\x1b[32mGreen\x1b[0m");
if (stripped !== "Green") throw new Error("CJS Strip ANSI failed");

const xpath = SelectorToXPath.cssSelectorToXPath("ul > li");
if (xpath !== "//ul/li") throw new Error("CJS CSS to XPath failed");

const emails = EmailExtract.extractEmails("cjs@toolkit.dev");
if (emails.length !== 1) throw new Error("CJS email extract failed");

const hex = HexView.bytesToHex(new Uint8Array([0x01, 0x02]));
if (hex !== "01 02") throw new Error("CJS hex view failed");

const lua = LuaValidate.validateLua("local msg = 'hello'");
if (!lua.valid) throw new Error("CJS lua validate failed");

console.log("✓ CommonJS Root and Subpath Exports verified successfully.");
