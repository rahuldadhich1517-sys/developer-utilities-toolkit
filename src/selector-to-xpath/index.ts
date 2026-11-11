import { ParsingError, UnsupportedError, ValidationError } from "../shared/errors.js";
import { assertNonEmptyString, assertString } from "../shared/validation.js";
import type { SelectorToXPathOptions, SupportedSelectorFeatures } from "./types.js";

export * from "./types.js";

/**
 * Safely escapes a string literal for use in an XPath expression.
 * Uses concat() when both single and double quotes are present.
 */
export function escapeXPathString(str: string): string {
  if (!str.includes("'")) {
    return `'${str}'`;
  }
  if (!str.includes('"')) {
    return `"${str}"`;
  }
  const parts = str.split("'");
  const args: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]!.length > 0) {
      args.push(`'${parts[i]}'`);
    }
    if (i < parts.length - 1) {
      args.push(`"'"`);
    }
  }
  return `concat(${args.join(", ")})`;
}

/**
 * Returns the list and details of supported selector features and unsupported features.
 */
export function getSupportedSelectorFeatures(): SupportedSelectorFeatures {
  return {
    elements: true,
    universal: true,
    id: true,
    class: true,
    attributeExistence: true,
    attributeEquality: true,
    attributePrefix: true,
    attributeSuffix: true,
    attributeSubstring: true,
    descendantCombinator: true,
    childCombinator: true,
    adjacentSiblingCombinator: true,
    generalSiblingCombinator: true,
    selectorGroups: true,
    pseudoClasses: [":first-child", ":last-child", ":nth-child()", ":nth-of-type()", ":not()", ":empty"],
    unsupported: [
      ":hover",
      ":active",
      ":focus",
      ":visited",
      ":has",
      ":is",
      ":where",
      ":target",
      ":enabled",
      ":disabled",
      ":checked",
      ":root",
      "::before",
      "::after",
      "namespace prefix (ns|tag)",
    ],
  };
}

interface ParsedSimpleSelector {
  tag: string;
  predicates: string[];
}

interface Step {
  combinator: "descendant" | "child" | "adjacentSibling" | "generalSibling";
  selector: ParsedSimpleSelector;
}

function parseNthExpression(arg: string): string {
  const trimmed = arg.trim();
  if (trimmed === "odd") {
    return "(count(preceding-sibling::*) + 1) mod 2 = 1";
  }
  if (trimmed === "even") {
    return "(count(preceding-sibling::*) + 1) mod 2 = 0";
  }
  const num = parseInt(trimmed, 10);
  if (!Number.isNaN(num) && String(num) === trimmed) {
    if (num <= 0) return "0 = 1"; // 1-based indexing in XPath, <=0 matches nothing
    return `count(preceding-sibling::*) = ${num - 1}`;
  }
  // Check for an+b format
  const match = /^([+-]?\d*)?n\s*([+-]\s*\d+)?$/i.exec(trimmed);
  if (match) {
    let aStr = match[1] ?? "";
    if (aStr === "" || aStr === "+") aStr = "1";
    else if (aStr === "-") aStr = "-1";
    const a = parseInt(aStr, 10);

    let bStr = match[2] ? match[2].replace(/\s+/g, "") : "0";
    const b = parseInt(bStr, 10);

    if (a === 0) {
      if (b <= 0) return "0 = 1";
      return `count(preceding-sibling::*) = ${b - 1}`;
    }
    // (pos - b) >= 0 and (pos - b) mod a = 0
    const pos = "(count(preceding-sibling::*) + 1)";
    if (a > 0) {
      return `${pos} >= ${b} and (${pos} - ${b}) mod ${a} = 0`;
    } else {
      // a < 0
      return `${pos} <= ${b} and (${b} - ${pos}) mod ${-a} = 0`;
    }
  }

  throw new ParsingError(`Unsupported or invalid :nth-child() argument: "${arg}"`);
}

function parseNthOfTypeExpression(arg: string): string {
  const trimmed = arg.trim();
  if (trimmed === "odd") {
    return "position() mod 2 = 1";
  }
  if (trimmed === "even") {
    return "position() mod 2 = 0";
  }
  const num = parseInt(trimmed, 10);
  if (!Number.isNaN(num) && String(num) === trimmed) {
    if (num <= 0) return "0 = 1";
    return `position() = ${num}`;
  }
  throw new ParsingError(`Unsupported or invalid :nth-of-type() argument: "${arg}"`);
}

/**
 * Tokenizes and parses a single compound selector (without combinators).
 */
function parseCompound(str: string): ParsedSimpleSelector {
  let i = 0;
  const len = str.length;
  let tag = "*";
  const predicates: string[] = [];

  // Parse tag name if present
  const tagMatch = /^[a-zA-Z0-9_\-*]+/.exec(str);
  if (tagMatch) {
    tag = tagMatch[0]!;
    i += tag.length;
  }

  while (i < len) {
    const char = str[i];

    if (char === "#") {
      // ID
      i++;
      const idMatch = /^[a-zA-Z0-9_\-]+/.exec(str.slice(i));
      if (!idMatch) {
        throw new ParsingError("Expected ID after '#'", { offset: i });
      }
      const id = idMatch[0]!;
      predicates.push(`@id=${escapeXPathString(id)}`);
      i += id.length;
    } else if (char === ".") {
      // Class
      i++;
      const classMatch = /^[a-zA-Z0-9_\-]+/.exec(str.slice(i));
      if (!classMatch) {
        throw new ParsingError("Expected class name after '.'", { offset: i });
      }
      const cls = classMatch[0]!;
      predicates.push(`contains(concat(' ', normalize-space(@class), ' '), ' ${cls} ')`);
      i += cls.length;
    } else if (char === "[") {
      // Attribute
      i++;
      let closing = -1;
      let inQuotes: string | null = null;
      for (let j = i; j < len; j++) {
        const c = str[j];
        if (inQuotes) {
          if (c === inQuotes && str[j - 1] !== "\\") {
            inQuotes = null;
          }
        } else if (c === '"' || c === "'") {
          inQuotes = c;
        } else if (c === "]") {
          closing = j;
          break;
        }
      }

      if (closing === -1) {
        throw new ParsingError("Unclosed attribute selector '['", { offset: i });
      }

      const attrExpr = str.slice(i, closing).trim();
      i = closing + 1;

      // Match [attr op val]
      const attrMatch = /^([a-zA-Z0-9_\-:]+)(?:\s*([~|^$*]?=)\s*(.*))?$/.exec(attrExpr);
      if (!attrMatch) {
        throw new ParsingError(`Invalid attribute selector: "[${attrExpr}]"`);
      }

      const attrName = attrMatch[1]!;
      const op = attrMatch[2];
      let val = attrMatch[3];

      if (!op) {
        // [attr]
        predicates.push(`@${attrName}`);
      } else if (val !== undefined) {
        // Strip quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1).replace(/\\(["'])/g, "$1");
        }
        const escaped = escapeXPathString(val);
        switch (op) {
          case "=":
            predicates.push(`@${attrName}=${escaped}`);
            break;
          case "^=":
            predicates.push(`starts-with(@${attrName}, ${escaped})`);
            break;
          case "$=":
            predicates.push(
              `substring(@${attrName}, string-length(@${attrName}) - string-length(${escaped}) + 1) = ${escaped}`
            );
            break;
          case "*=":
            predicates.push(`contains(@${attrName}, ${escaped})`);
            break;
          case "~=":
            predicates.push(`contains(concat(' ', normalize-space(@${attrName}), ' '), concat(' ', ${escaped}, ' '))`);
            break;
          default:
            throw new UnsupportedError(op, `Unsupported attribute operator: "${op}"`);
        }
      }
    } else if (char === ":") {
      // Pseudo-class
      if (str.startsWith("::", i)) {
        throw new UnsupportedError("Pseudo-elements (::before, ::after)", "CSS pseudo-elements are not supported in XPath");
      }
      i++;
      const pseudoMatch = /^[a-zA-Z0-9_\-]+(?:\([^)]*\))?/.exec(str.slice(i));
      if (!pseudoMatch) {
        throw new ParsingError("Expected pseudo-class name after ':'", { offset: i });
      }
      const pseudoFull = pseudoMatch[0]!;
      i += pseudoFull.length;

      if (pseudoFull === "first-child") {
        predicates.push("not(preceding-sibling::*)");
      } else if (pseudoFull === "last-child") {
        predicates.push("not(following-sibling::*)");
      } else if (pseudoFull === "empty") {
        predicates.push("not(node())");
      } else if (pseudoFull.startsWith("nth-child(") && pseudoFull.endsWith(")")) {
        const arg = pseudoFull.slice(10, -1);
        predicates.push(parseNthExpression(arg));
      } else if (pseudoFull.startsWith("nth-of-type(") && pseudoFull.endsWith(")")) {
        const arg = pseudoFull.slice(12, -1);
        predicates.push(parseNthOfTypeExpression(arg));
      } else if (pseudoFull.startsWith("not(") && pseudoFull.endsWith(")")) {
        const inner = pseudoFull.slice(4, -1).trim();
        const parsedInner = parseCompound(inner);
        const innerPreds: string[] = [];
        if (parsedInner.tag !== "*") {
          innerPreds.push(`self::${parsedInner.tag}`);
        }
        for (const p of parsedInner.predicates) {
          innerPreds.push(p);
        }
        if (innerPreds.length === 1) {
          predicates.push(`not(${innerPreds[0]})`);
        } else if (innerPreds.length > 1) {
          predicates.push(`not(${innerPreds.join(" and ")})`);
        }
      } else {
        throw new UnsupportedError(
          `:${pseudoFull}`,
          `Unsupported pseudo-class: ":${pseudoFull}". Only :first-child, :last-child, :nth-child(), :nth-of-type(), :not(), :empty are supported.`
        );
      }
    } else {
      throw new ParsingError(`Unexpected character in selector: "${char}"`, { offset: i });
    }
  }

  return { tag, predicates };
}

function parseSelectorChain(selector: string): Step[] {
  const steps: Step[] = [];
  let currentCombinator: Step["combinator"] = "descendant";
  let i = 0;
  const len = selector.length;

  while (i < len) {
    // Skip leading whitespace
    while (i < len && /\s/.test(selector[i]!)) i++;
    if (i >= len) break;

    // Check if combinator
    if (selector[i] === ">") {
      currentCombinator = "child";
      i++;
      continue;
    } else if (selector[i] === "+") {
      currentCombinator = "adjacentSibling";
      i++;
      continue;
    } else if (selector[i] === "~") {
      currentCombinator = "generalSibling";
      i++;
      continue;
    }

    // Read compound token until next combinator or end
    let start = i;
    let inBracket = false;
    let inParen = false;

    while (i < len) {
      const c = selector[i];
      if (c === "[") inBracket = true;
      else if (c === "]") inBracket = false;
      else if (c === "(") inParen = true;
      else if (c === ")") inParen = false;
      else if (!inBracket && !inParen) {
        if (c === ">" || c === "+" || c === "~" || /\s/.test(c!)) {
          break;
        }
      }
      i++;
    }

    const compoundStr = selector.slice(start, i).trim();
    if (compoundStr) {
      const parsed = parseCompound(compoundStr);
      steps.push({
        combinator: steps.length === 0 ? "descendant" : currentCombinator,
        selector: parsed,
      });
      // Default next combinator to descendant if followed by whitespace
      currentCombinator = "descendant";
    }
  }

  return steps;
}

function stepsToXPath(steps: Step[], relative = false): string {
  if (steps.length === 0) return "";
  let xpath = "";

  for (let idx = 0; idx < steps.length; idx++) {
    const step = steps[idx]!;
    const { tag, predicates } = step.selector;
    const predStr = predicates.length > 0 ? `[${predicates.join("][")}]` : "";

    if (idx === 0) {
      xpath = `${relative ? ".//" : "//"}${tag}${predStr}`;
    } else {
      switch (step.combinator) {
        case "descendant":
          xpath += `//${tag}${predStr}`;
          break;
        case "child":
          xpath += `/${tag}${predStr}`;
          break;
        case "adjacentSibling":
          xpath += `/following-sibling::*[1]/self::${tag}${predStr}`;
          break;
        case "generalSibling":
          xpath += `/following-sibling::${tag}${predStr}`;
          break;
      }
    }
  }

  return xpath;
}

/**
 * Validates whether a CSS selector string is syntactically supported.
 */
export function validateCssSelector(selector: string): { valid: boolean; error?: string } {
  try {
    assertNonEmptyString(selector, "selector");
    cssSelectorToXPath(selector);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Converts a CSS selector list (comma-separated or string array) to an XPath expression.
 */
export function convertSelectorListToXPath(selectors: string[] | string): string {
  const list = Array.isArray(selectors) ? selectors : selectors.split(",");
  const converted = list
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => cssSelectorToXPath(s));

  if (converted.length === 0) {
    throw new ValidationError("No valid selectors provided in selector list");
  }

  return converted.join(" | ");
}

/**
 * Converts a CSS selector into a corresponding XPath 1.0 expression.
 */
export function cssSelectorToXPath(selector: string, options?: SelectorToXPathOptions): string {
  assertString(selector, "selector");
  const trimmed = selector.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Selector cannot be empty");
  }

  // Handle top-level selector grouping with commas (ignoring commas inside [] or ())
  const groups: string[] = [];
  let start = 0;
  let inBracket = false;
  let inParen = false;

  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === "[") inBracket = true;
    else if (c === "]") inBracket = false;
    else if (c === "(") inParen = true;
    else if (c === ")") inParen = false;
    else if (c === "," && !inBracket && !inParen) {
      groups.push(trimmed.slice(start, i).trim());
      start = i + 1;
    }
  }
  groups.push(trimmed.slice(start).trim());

  if (groups.length > 1) {
    return groups.map((g) => cssSelectorToXPath(g, options)).join(" | ");
  }

  const steps = parseSelectorChain(trimmed);
  if (steps.length === 0) {
    throw new ParsingError("Failed to parse CSS selector into valid steps");
  }

  return stepsToXPath(steps, options?.relative ?? false);
}
