import { parseHtmlDocument, parseXmlDocument } from "../xpath-test/index.js";

/**
 * Parses an XML string using the browser's ambient DOMParser.
 */
export function parseBrowserXml(xmlString: string): Document {
  return parseXmlDocument(xmlString);
}

/**
 * Parses an HTML string into a Document using the browser's ambient DOMParser.
 */
export function parseBrowserHtml(htmlString: string): Document {
  return parseHtmlDocument(htmlString);
}
