export interface HtmlLiveEditOptions {
  html: string;
  css?: string;
  javascript?: string;
  title?: string;
  allowScripts?: boolean; // default false
  csp?: string | boolean; // custom CSP string or boolean to toggle default strict CSP (default true)
  baseHref?: string;
  sandboxFlags?: string[]; // Recommended iframe sandbox flags e.g. ["allow-scripts"]
  trusted?: boolean; // default false
}

export interface HtmlValidationResult {
  valid: boolean;
  hasScripts: boolean;
  hasForms: boolean;
  hasExternalResources: boolean;
  warnings: string[];
  errors: string[];
}

export interface PreviewDocumentResult {
  documentHtml: string;
  sandboxAttribute: string;
  cspHeader: string;
  isSandboxed: boolean;
  warnings: string[];
}
