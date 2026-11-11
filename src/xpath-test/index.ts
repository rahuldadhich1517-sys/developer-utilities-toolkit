import { ConfigurationError, ParsingError, ValidationError } from "../shared/errors.js";
import { assertNonEmptyString, assertString } from "../shared/validation.js";
import type {
  EvaluateXPathOptions,
  XPathEvaluationResult,
  XPathResultType,
} from "./types.js";

export * from "./types.js";

/**
 * Parses an XML string into a DOM Document using native DOMParser.
 */
export function parseXmlDocument(
  xmlString: string,
  domParserInstance?: unknown
): Document {
  assertString(xmlString, "XML content");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ParserConstructor = (domParserInstance as any) ?? (typeof DOMParser !== "undefined" ? DOMParser : null);
  if (!ParserConstructor) {
    throw new ConfigurationError(
      "DOMParser is not available in the current runtime environment. Provide a DOMParser instance or execute in a browser environment."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parser = typeof ParserConstructor === "function" ? new (ParserConstructor as any)() : ParserConstructor;
  const doc = parser.parseFromString(xmlString, "application/xml") as Document;

  const parserError = doc.querySelector ? doc.querySelector("parsererror") : null;
  if (parserError) {
    throw new ParsingError(`XML parser error: ${parserError.textContent?.trim() || "Malformed XML document"}`);
  }

  return doc;
}

/**
 * Parses an HTML string into a DOM Document using native DOMParser.
 */
export function parseHtmlDocument(
  htmlString: string,
  domParserInstance?: unknown
): Document {
  assertString(htmlString, "HTML content");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ParserConstructor = (domParserInstance as any) ?? (typeof DOMParser !== "undefined" ? DOMParser : null);
  if (!ParserConstructor) {
    throw new ConfigurationError(
      "DOMParser is not available in the current runtime environment. Provide a DOMParser instance or execute in a browser environment."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parser = typeof ParserConstructor === "function" ? new (ParserConstructor as any)() : ParserConstructor;
  return parser.parseFromString(htmlString, "text/html") as Document;
}

/**
 * Validates whether an XPath expression is syntactically valid against a Document.
 */
export function validateXPath(
  expression: string,
  doc?: Document
): { valid: boolean; error?: string } {
  try {
    assertNonEmptyString(expression, "XPath expression");
    const targetDoc = doc ?? (typeof document !== "undefined" ? document : null);
    if (!targetDoc || typeof targetDoc.evaluate !== "function") {
      throw new ConfigurationError("XPath evaluation requires a DOM Document with evaluate() method.");
    }
    // XPathResult.ANY_TYPE = 0
    targetDoc.evaluate(expression, targetDoc, null, 0, null);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function formatNodeValue(node: Node): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((node as any).outerHTML) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (node as any).outerHTML;
  }
  if (node.nodeType === 2) {
    // Attribute node
    return `@${node.nodeName}="${node.nodeValue}"`;
  }
  return node.nodeValue ?? node.textContent ?? `<${node.nodeName}>`;
}

/**
 * Evaluates an XPath 1.0 expression against a supplied or ambient DOM Document.
 */
export function evaluateXPath(
  expression: string,
  options?: EvaluateXPathOptions
): XPathEvaluationResult {
  assertNonEmptyString(expression, "XPath expression");

  const doc = options?.document ?? (typeof document !== "undefined" ? document : null);
  if (!doc || typeof doc.evaluate !== "function") {
    throw new ConfigurationError(
      "No DOM Document with evaluate() available. Please pass an explicit document option or run in a browser environment."
    );
  }

  const contextNode = options?.contextNode ?? doc;
  const resolver = options?.resolver ?? null;

  try {
    // 0 = ANY_TYPE
    const result = doc.evaluate(expression, contextNode, resolver, 0, null);

    let type: XPathResultType = "empty";
    let stringValue: string | undefined;
    let numberValue: number | undefined;
    let booleanValue: boolean | undefined;
    const nodes: Node[] = [];
    const formattedValues: string[] = [];

    // 1: NUMBER_TYPE, 2: STRING_TYPE, 3: BOOLEAN_TYPE, 4/5: ITERATOR, 6/7: SNAPSHOT, 8/9: SINGLE_NODE
    switch (result.resultType) {
      case 1: // NUMBER_TYPE
        type = "number";
        numberValue = result.numberValue;
        formattedValues.push(String(numberValue));
        break;
      case 2: // STRING_TYPE
        type = "string";
        stringValue = result.stringValue;
        formattedValues.push(stringValue);
        break;
      case 3: // BOOLEAN_TYPE
        type = "boolean";
        booleanValue = result.booleanValue;
        formattedValues.push(String(booleanValue));
        break;
      case 4: // UNORDERED_NODE_ITERATOR_TYPE
      case 5: { // ORDERED_NODE_ITERATOR_TYPE
        type = "nodes";
        let node: Node | null;
        while ((node = result.iterateNext()) !== null) {
          nodes.push(node);
          formattedValues.push(formatNodeValue(node));
        }
        break;
      }
      case 8: // ANY_UNORDERED_NODE_TYPE
      case 9: { // FIRST_ORDERED_NODE_TYPE
        type = "nodes";
        if (result.singleNodeValue) {
          nodes.push(result.singleNodeValue);
          formattedValues.push(formatNodeValue(result.singleNodeValue));
        }
        break;
      }
      default:
        type = "empty";
        break;
    }

    return {
      success: true,
      type: nodes.length === 0 && type === "nodes" ? "empty" : type,
      nodesCount: nodes.length,
      stringValue,
      numberValue,
      booleanValue,
      nodes: nodes.length > 0 ? nodes : undefined,
      formattedValues,
    };
  } catch (err) {
    return {
      success: false,
      type: "error",
      nodesCount: 0,
      formattedValues: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Queries and returns matching DOM nodes for an XPath expression.
 */
export function queryXPathNodes(
  expression: string,
  options?: EvaluateXPathOptions
): Node[] {
  const result = evaluateXPath(expression, options);
  if (!result.success) {
    throw new ValidationError(`XPath evaluation failed: ${result.error}`);
  }
  return result.nodes ?? [];
}

/**
 * Formats XPath evaluation result into a human-readable summary string.
 */
export function formatXPathResult(result: XPathEvaluationResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  switch (result.type) {
    case "string":
      return `String: "${result.stringValue}"`;
    case "number":
      return `Number: ${result.numberValue}`;
    case "boolean":
      return `Boolean: ${result.booleanValue}`;
    case "nodes":
      return `Matches (${result.nodesCount}):\n` + result.formattedValues.map((v, i) => `[${i + 1}] ${v}`).join("\n");
    case "empty":
      return "No matching nodes or values found.";
    default:
      return "Empty result.";
  }
}
