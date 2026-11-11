import { ValidationError } from "../shared/errors.js";
import { escapeHtml } from "../shared/html-escape.js";
import { assertString } from "../shared/validation.js";
import type {
  HtmlLiveEditOptions,
  HtmlValidationResult,
  PreviewDocumentResult,
} from "./types.js";

export * from "./types.js";

/**
 * Returns a standardized preview configuration object with safe defaults.
 */
export function createPreviewOptions(
  overrides?: Partial<HtmlLiveEditOptions>
): HtmlLiveEditOptions {
  return {
    html: "",
    css: "",
    javascript: "",
    title: "Preview",
    allowScripts: false,
    csp: true,
    trusted: false,
    sandboxFlags: [],
    ...overrides,
  };
}

/**
 * Inspects untrusted HTML input for potential security risks, active scripts, forms, and external resources.
 */
export function validateHtmlInput(html: string): HtmlValidationResult {
  assertString(html, "HTML input");

  const warnings: string[] = [];
  const errors: string[] = [];

  const hasScriptTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(html);
  const hasInlineHandlers = /\bon[a-z]+\s*=/i.test(html);
  const hasJavascriptUris = /href\s*=\s*['"]\s*javascript:/i.test(html);
  const hasScripts = hasScriptTags || hasInlineHandlers || hasJavascriptUris;

  if (hasScripts) {
    warnings.push("HTML input contains executable JavaScript code or event handlers.");
  }

  const hasForms = /<form\b[^>]*>/i.test(html);
  if (hasForms) {
    warnings.push("HTML input contains form elements which may submit data.");
  }

  const hasExternalResources = /<(?:link|script|img|iframe|audio|video|source)\b[^>]+(?:src|href)\s*=\s*['"]https?:\/\//i.test(html);
  if (hasExternalResources) {
    warnings.push("HTML input references external remote URLs.");
  }

  // Check unclosed tags or severe malformations
  const openTags = (html.match(/<[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/g) || []).length;
  const closeTags = (html.match(/<\/[a-zA-Z][a-zA-Z0-9]*>/g) || []).length;
  if (Math.abs(openTags - closeTags) > 50) {
    warnings.push("Possible unclosed tags or severely unbalanced markup detected.");
  }

  return {
    valid: errors.length === 0,
    hasScripts,
    hasForms,
    hasExternalResources,
    warnings,
    errors,
  };
}

/**
 * Builds a Content Security Policy string tailored for live editing preview documents.
 */
function buildCsp(options: HtmlLiveEditOptions): string {
  if (options.csp === false) {
    return "";
  }

  if (typeof options.csp === "string") {
    return options.csp;
  }

  const directives: string[] = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "img-src data: blob: https:",
    "font-src data: https:",
    "media-src data: blob: https:",
  ];

  if (options.allowScripts) {
    directives.push("script-src 'unsafe-inline'");
  }

  return directives.join("; ");
}

/**
 * Builds a standalone HTML document string from HTML, optional CSS, and optional JS.
 */
export function createHtmlDocument(options: HtmlLiveEditOptions): string {
  if (!options || typeof options !== "object") {
    throw new ValidationError("Options must be provided as an object");
  }

  const htmlContent = options.html ?? "";
  const cssContent = options.css?.trim();
  const jsContent = options.javascript?.trim();
  const title = options.title ? escapeHtml(options.title) : "Preview Document";
  const cspString = buildCsp(options);

  const styleTag = cssContent ? `\n  <style>\n${cssContent}\n  </style>` : "";
  const cspTag = cspString ? `\n  <meta http-equiv="Content-Security-Policy" content="${cspString.replace(/"/g, "&quot;")}">` : "";
  const baseTag = options.baseHref ? `\n  <base href="${escapeHtml(options.baseHref)}">` : "";

  let scriptTag = "";
  if (options.allowScripts && jsContent) {
    // Avoid breaking the </script> tag
    const safeJs = jsContent.replace(/<\/script>/gi, "<\\/script>");
    scriptTag = `\n  <script>\n${safeJs}\n  </script>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">${cspTag}${baseTag}
  <title>${title}</title>${styleTag}
</head>
<body>
${htmlContent}${scriptTag}
</body>
</html>`;
}

/**
 * Generates a full preview document result with recommended iframe sandbox attribute.
 */
export function createHtmlPreviewDocument(
  options: HtmlLiveEditOptions
): PreviewDocumentResult {
  const opts = createPreviewOptions(options);
  const validation = validateHtmlInput(opts.html);
  const documentHtml = createHtmlDocument(opts);
  const cspHeader = buildCsp(opts);

  // Recommended sandbox flags for iframe
  // NEVER grant allow-same-origin automatically!
  const sandboxList: string[] = [];
  if (opts.allowScripts) {
    sandboxList.push("allow-scripts");
  }

  if (opts.sandboxFlags && opts.sandboxFlags.length > 0) {
    for (const flag of opts.sandboxFlags) {
      if (flag === "allow-same-origin") {
        throw new ValidationError(
          "For security reasons, 'allow-same-origin' is strictly prohibited in preview sandboxes to prevent credential theft and parent frame access."
        );
      }
      if (!sandboxList.includes(flag)) {
        sandboxList.push(flag);
      }
    }
  }

  return {
    documentHtml,
    sandboxAttribute: sandboxList.join(" "),
    cspHeader,
    isSandboxed: true,
    warnings: validation.warnings,
  };
}
