import type { PreviewDocumentResult } from "../html-live-edit/types.js";

export interface IframePreviewAttributes {
  srcdoc: string;
  sandbox: string;
  csp?: string;
  loading: "lazy";
}

/**
 * Returns safe attributes to apply directly to a preview iframe element in React or vanilla DOM.
 */
export function createPreviewIframeAttributes(
  preview: PreviewDocumentResult
): IframePreviewAttributes {
  return {
    srcdoc: preview.documentHtml,
    sandbox: preview.sandboxAttribute,
    csp: preview.cspHeader || undefined,
    loading: "lazy",
  };
}
