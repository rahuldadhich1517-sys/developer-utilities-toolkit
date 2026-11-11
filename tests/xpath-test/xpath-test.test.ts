import { describe, expect, it } from "vitest";
import {
  evaluateXPath,
  formatXPathResult,
  parseHtmlDocument,
  parseXmlDocument,
  queryXPathNodes,
  validateXPath,
} from "../../src/xpath-test/index.js";
import { ConfigurationError, ParsingError } from "../../src/shared/errors.js";

// Mock minimal DOMParser and Document for Node environment tests
class MockElement {
  nodeType = 1;
  nodeName: string;
  outerHTML: string;
  textContent: string;

  constructor(tagName: string, text = "") {
    this.nodeName = tagName.toUpperCase();
    this.textContent = text;
    this.outerHTML = `<${tagName}>${text}</${tagName}>`;
  }
}

class MockXPathResult {
  resultType: number;
  numberValue?: number;
  stringValue?: string;
  booleanValue?: boolean;
  singleNodeValue?: unknown;
  private nodes: unknown[];
  private idx = 0;

  constructor(type: number, data: unknown) {
    this.resultType = type;
    this.nodes = Array.isArray(data) ? data : [];
    if (type === 1) this.numberValue = data;
    if (type === 2) this.stringValue = data;
    if (type === 3) this.booleanValue = data;
    if (type === 8 || type === 9) this.singleNodeValue = data;
  }

  iterateNext() {
    if (this.idx < this.nodes.length) {
      return this.nodes[this.idx++];
    }
    return null;
  }
}

class MockDocument {
  evaluate(expr: string, _context: unknown, _resolver: unknown, _type: number, _result: unknown) {
    if (expr.includes("INVALID")) {
      throw new Error(`Syntax error in XPath expression: "${expr}"`);
    }
    if (expr.startsWith("count(")) {
      return new MockXPathResult(1, 42); // NUMBER_TYPE
    }
    if (expr.startsWith("string(")) {
      return new MockXPathResult(2, "extracted text"); // STRING_TYPE
    }
    if (expr.startsWith("boolean(")) {
      return new MockXPathResult(3, true); // BOOLEAN_TYPE
    }
    if (expr === "//empty") {
      return new MockXPathResult(4, []); // empty nodes
    }
    // Return sample elements
    if (expr === "//single") {
      return new MockXPathResult(9, new MockElement("h1", "Single"));
    }
    if (expr === "//@attr") {
      return new MockXPathResult(4, [{
        nodeType: 2,
        nodeName: "data-test",
        nodeValue: "sample-val",
      }]);
    }
    return new MockXPathResult(4, [
      new MockElement("div", "Hello"),
      new MockElement("p", "World"),
    ]);
  }
}

class MockDOMParser {
  parseFromString(str: string, type: string) {
    if (type === "application/xml" && str.includes("<malformed")) {
      return {
        querySelector(selector: string) {
          if (selector === "parsererror") {
            return { textContent: "XML parsing syntax error" };
          }
          return null;
        },
      };
    }
    return new MockDocument();
  }
}

describe("xpath-test utility", () => {
  const doc = new MockDocument() as unknown as Document;
  const parser = new MockDOMParser();

  it("evaluates count / number expressions", () => {
    const res = evaluateXPath("count(//div)", { document: doc });
    expect(res.success).toBe(true);
    expect(res.type).toBe("number");
    expect(res.numberValue).toBe(42);
    expect(formatXPathResult(res)).toBe("Number: 42");
  });

  it("evaluates string expressions", () => {
    const res = evaluateXPath("string(//h1)", { document: doc });
    expect(res.success).toBe(true);
    expect(res.type).toBe("string");
    expect(res.stringValue).toBe("extracted text");
    expect(formatXPathResult(res)).toBe('String: "extracted text"');
  });

  it("evaluates boolean expressions", () => {
    const res = evaluateXPath("boolean(//button)", { document: doc });
    expect(res.success).toBe(true);
    expect(res.type).toBe("boolean");
    expect(res.booleanValue).toBe(true);
    expect(formatXPathResult(res)).toBe("Boolean: true");
  });

  it("evaluates node selections and formats matches", () => {
    const res = evaluateXPath("//div", { document: doc });
    expect(res.success).toBe(true);
    expect(res.type).toBe("nodes");
    expect(res.nodesCount).toBe(2);
    expect(res.formattedValues).toHaveLength(2);
    expect(formatXPathResult(res)).toContain("Matches (2):");

    const singleRes = evaluateXPath("//single", { document: doc });
    expect(singleRes.nodesCount).toBe(1);

    const attrRes = evaluateXPath("//@attr", { document: doc });
    expect(attrRes.formattedValues[0]).toBe('@data-test="sample-val"');
  });

  it("handles empty node match results", () => {
    const res = evaluateXPath("//empty", { document: doc });
    expect(res.success).toBe(true);
    expect(res.type).toBe("empty");
    expect(res.nodesCount).toBe(0);
    expect(formatXPathResult(res)).toBe("No matching nodes or values found.");
  });

  it("queries XPath nodes directly returning array", () => {
    const nodes = queryXPathNodes("//div", { document: doc });
    expect(nodes).toHaveLength(2);
  });

  it("validates XPath syntax and handles errors", () => {
    expect(validateXPath("//div", doc).valid).toBe(true);
    expect(validateXPath("INVALID//expr", doc).valid).toBe(false);

    const errRes = evaluateXPath("INVALID//expr", { document: doc });
    expect(errRes.success).toBe(false);
    expect(errRes.type).toBe("error");
    expect(errRes.error).toContain("Syntax error");
    expect(formatXPathResult(errRes)).toContain("Error:");
  });

  it("parses XML documents with DOMParser and catches parser errors", () => {
    const validXml = "<root><item>1</item></root>";
    const parsedDoc = parseXmlDocument(validXml, parser);
    expect(parsedDoc).toBeDefined();

    expect(() => parseXmlDocument("<malformed", parser)).toThrow(ParsingError);
  });

  it("parses HTML documents with DOMParser", () => {
    const html = "<!DOCTYPE html><html><body><h1>Title</h1></body></html>";
    const parsedDoc = parseHtmlDocument(html, parser);
    expect(parsedDoc).toBeDefined();
  });

  it("throws ConfigurationError when DOMParser or Document is missing", () => {
    expect(() => evaluateXPath("//div")).toThrow(ConfigurationError);
    expect(() => parseXmlDocument("<root/>", null)).toThrow(ConfigurationError);
  });
});
