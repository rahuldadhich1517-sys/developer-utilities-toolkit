export type XPathResultType =
  | "string"
  | "number"
  | "boolean"
  | "nodes"
  | "empty"
  | "error";

export interface XPathEvaluationResult {
  success: boolean;
  type: XPathResultType;
  nodesCount: number;
  stringValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  nodes?: Node[];
  formattedValues: string[];
  error?: string;
}

export interface EvaluateXPathOptions {
  document?: Document;
  contextNode?: Node;
  resolver?: XPathNSResolver | ((prefix: string | null) => string | null) | null;
}
