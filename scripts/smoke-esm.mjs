// Smoke test for ESM root and subpath exports
import * as Root from "../dist/index.js";
import * as Pastebin from "../dist/pastebin/index.js";
import * as AnsiColor from "../dist/ansi-color/index.js";
import * as SelectorToXPath from "../dist/selector-to-xpath/index.js";
import * as EmailExtract from "../dist/email-extract/index.js";
import * as HexView from "../dist/hex-view/index.js";
import * as HtmlLiveEdit from "../dist/html-live-edit/index.js";
import * as KeycodeFind from "../dist/keycode-find/index.js";
import * as LuaValidate from "../dist/lua-validate/index.js";
import * as RawFileView from "../dist/raw-file-view/index.js";
import * as StackTraceParse from "../dist/stack-trace-parse/index.js";
import * as XPathTest from "../dist/xpath-test/index.js";
import * as Browser from "../dist/browser/index.js";

console.log("Testing ESM Root and Subpath Exports...");

// Verify functions exist on exports
if (typeof Root.createSnippetPayload !== "function") throw new Error("Root.createSnippetPayload missing");
if (typeof Pastebin.createShareableSnippetUrl !== "function") throw new Error("Pastebin.createShareableSnippetUrl missing");
if (typeof AnsiColor.colorizeAnsi !== "function") throw new Error("AnsiColor.colorizeAnsi missing");
if (typeof SelectorToXPath.cssSelectorToXPath !== "function") throw new Error("SelectorToXPath.cssSelectorToXPath missing");
if (typeof EmailExtract.extractEmails !== "function") throw new Error("EmailExtract.extractEmails missing");
if (typeof HexView.formatHexView !== "function") throw new Error("HexView.formatHexView missing");
if (typeof HtmlLiveEdit.createHtmlPreviewDocument !== "function") throw new Error("HtmlLiveEdit.createHtmlPreviewDocument missing");
if (typeof KeycodeFind.getKeyEventInfo !== "function") throw new Error("KeycodeFind.getKeyEventInfo missing");
if (typeof LuaValidate.validateLua !== "function") throw new Error("LuaValidate.validateLua missing");
if (typeof RawFileView.inspectRawFile !== "function") throw new Error("RawFileView.inspectRawFile missing");
if (typeof StackTraceParse.parseStackTrace !== "function") throw new Error("StackTraceParse.parseStackTrace missing");
if (typeof XPathTest.evaluateXPath !== "function") throw new Error("XPathTest.evaluateXPath missing");
if (typeof Browser.createPreviewIframeAttributes !== "function") throw new Error("Browser.createPreviewIframeAttributes missing");

// Execute sample functions
const snippet = Pastebin.createSnippetPayload({ content: "test" });
if (!snippet.content) throw new Error("Snippet payload failed");

const stripped = AnsiColor.stripAnsi("\x1b[31mRed\x1b[0m");
if (stripped !== "Red") throw new Error("Strip ANSI failed");

const xpath = SelectorToXPath.cssSelectorToXPath("div > p");
if (xpath !== "//div/p") throw new Error("CSS to XPath failed");

const emails = EmailExtract.extractEmails("test@domain.com");
if (emails.length !== 1) throw new Error("Email extract failed");

const hex = HexView.bytesToHex(new Uint8Array([0x41, 0x42]));
if (hex !== "41 42") throw new Error("Hex view failed");

const preview = HtmlLiveEdit.createHtmlPreviewDocument({ html: "<h1>Test</h1>" });
if (!preview.documentHtml.includes("<h1>Test</h1>")) throw new Error("Preview doc failed");

const keyInfo = KeycodeFind.getKeyEventInfo({ key: "A" });
if (keyInfo.key !== "A") throw new Error("Key info failed");

const lua = LuaValidate.validateLua("local a = 1");
if (!lua.valid) throw new Error("Lua validation failed");

const raw = RawFileView.inspectRawFile(new Uint8Array([0xef, 0xbb, 0xbf, 65]));
if (raw.detectedEncoding !== "UTF-8-BOM") throw new Error("Raw file view failed");

const stack = StackTraceParse.parseStackTrace("    at foo (app.js:10:5)");
if (stack.frames.length !== 1) throw new Error("Stack parse failed");

console.log("✓ ESM Root and Subpath Exports verified successfully.");
