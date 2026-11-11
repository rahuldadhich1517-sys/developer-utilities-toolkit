import { describe, expect, it } from "vitest";
import {
  createPreviewIframeAttributes,
  inspectKeyboardEvent,
  isShortcutPressed,
  parseBrowserHtml,
  parseBrowserXml,
} from "../../src/browser/index.js";
import { createHtmlPreviewDocument } from "../../src/html-live-edit/index.js";

describe("browser helpers entry point", () => {
  it("creates iframe preview attributes for React / DOM", () => {
    const preview = createHtmlPreviewDocument({
      html: "<p>Hello</p>",
      allowScripts: false,
    });

    const attrs = createPreviewIframeAttributes(preview);
    expect(attrs.srcdoc).toContain("<p>Hello</p>");
    expect(attrs.sandbox).toBe("");
    expect(attrs.loading).toBe("lazy");
    expect(attrs.csp).toBeDefined();
  });

  it("parses browser xml and html using dom-parser helpers", () => {
    // In Node without ambient DOMParser, it throws ConfigurationError
    expect(() => parseBrowserXml("<root/>")).toThrow();
    expect(() => parseBrowserHtml("<div>test</div>")).toThrow();
  });

  it("identifies shortcut key combinations", () => {
    const mockEvent = {
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    } as unknown as KeyboardEvent;

    expect(isShortcutPressed(mockEvent, "Ctrl+S")).toBe(true);
    expect(isShortcutPressed(mockEvent, "Ctrl+Shift+S")).toBe(false);

    const info = inspectKeyboardEvent(mockEvent);
    expect(info.key).toBe("s");
    expect(info.shortcut).toBe("Ctrl+S");
  });
});
