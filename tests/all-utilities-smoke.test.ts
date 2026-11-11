import { describe, expect, it } from "vitest";
import {
  // Utility 1: pastebin
  createSnippetPayload,
  createShareableSnippetUrl,
  decodeSnippet,
  encodeSnippet,
  // Utility 2: ansi-color
  ansiColor,
  colorizeAnsi,
  stripAnsi,
  // Utility 3: selector-to-xpath
  cssSelectorToXPath,
  validateCssSelector,
  // Utility 4: email-extract
  extractUniqueEmails,
  // Utility 5: hex-view
  bytesToHex,
  formatHexView,
  // Utility 6: html-live-edit
  createHtmlPreviewDocument,
  validateHtmlInput,
  // Utility 7: keycode-find
  getKeyEventInfo,
  // Utility 8: lua-validate
  validateLua,
  // Utility 9: raw-file-view
  detectLineEndings,
  inspectRawFile,
  // Utility 10: stack-trace-parse
  parseStackTrace,
  // Utility 11: xpath-test
  formatXPathResult,
  validateXPath,
} from "../src/index.js";

describe("All 11 Utilities Smoke Integration Test", () => {
  it("executes all 11 utilities in a unified workflow", () => {
    // 1. pastebin
    const snippet = createSnippetPayload({ content: "let a = 1;", language: "typescript" });
    const encoded = encodeSnippet(snippet);
    const decoded = decodeSnippet(encoded);
    const shareUrl = createShareableSnippetUrl(snippet);
    expect(decoded.content).toBe("let a = 1;");
    expect(shareUrl).toContain("#snippet=");

    // 2. ansi-color
    const colored = colorizeAnsi("status: ok", { color: "green", style: "bold" });
    expect(stripAnsi(colored)).toBe("status: ok");
    expect(ansiColor("red")).toBe("\x1b[31m");

    // 3. selector-to-xpath
    expect(validateCssSelector("div.app > header").valid).toBe(true);
    const xpath = cssSelectorToXPath("div.app > header");
    expect(xpath).toBe("//div[contains(concat(' ', normalize-space(@class), ' '), ' app ')]/header");

    // 4. email-extract
    const textWithEmails = "Contact dev@toolkit.dev or support@toolkit.dev";
    const emails = extractUniqueEmails(textWithEmails);
    expect(emails).toHaveLength(2);
    expect(emails[0]!.email).toBe("dev@toolkit.dev");

    // 5. hex-view
    const sampleBytes = new TextEncoder().encode("Toolkit");
    expect(bytesToHex(sampleBytes)).toBe("54 6F 6F 6C 6B 69 74");
    const hexView = formatHexView(sampleBytes);
    expect(hexView.rows).toHaveLength(1);
    expect(hexView.rows[0]!.asciiFormatted).toBe("Toolkit");

    // 6. html-live-edit
    const htmlValidation = validateHtmlInput("<p>Hello</p>");
    expect(htmlValidation.valid).toBe(true);
    const preview = createHtmlPreviewDocument({ html: "<p>Hello</p>" });
    expect(preview.documentHtml).toContain("<!DOCTYPE html>");

    // 7. keycode-find
    const keyInfo = getKeyEventInfo({ key: "Enter", code: "Enter" });
    expect(keyInfo.category).toBe("whitespace");
    expect(keyInfo.key).toBe("Enter");

    // 8. lua-validate
    const luaCheck = validateLua("local x = 10\nprint(x)");
    expect(luaCheck.valid).toBe(true);
    expect(luaCheck.version).toBe("Lua 5.4");

    // 9. raw-file-view
    const lineStats = detectLineEndings("line1\r\nline2\r\n");
    expect(lineStats.detectedLineEnding).toBe("CRLF");
    const rawInspection = inspectRawFile(sampleBytes);
    expect(rawInspection.detectedEncoding).toBe("ASCII");

    // 10. stack-trace-parse
    const parsedStack = parseStackTrace("    at main (/src/index.ts:1:1)");
    expect(parsedStack.frames).toHaveLength(1);
    expect(parsedStack.frames[0]!.functionName).toBe("main");

    // 11. xpath-test
    const mockDoc = {
      evaluate: () => ({
        resultType: 2,
        stringValue: "ok",
      }),
    } as unknown as Document;
    expect(validateXPath("//div", mockDoc).valid).toBe(true);
    const formatted = formatXPathResult({
      success: true,
      type: "string",
      stringValue: "ok",
      nodesCount: 0,
      formattedValues: ["ok"],
    });
    expect(formatted).toBe('String: "ok"');
  });
});
