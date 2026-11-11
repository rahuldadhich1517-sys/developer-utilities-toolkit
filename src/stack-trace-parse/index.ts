import { ValidationError } from "../shared/errors.js";
import type {
  FormatStackTraceOptions,
  ParsedStackTrace,
  StackFrame,
} from "./types.js";

export * from "./types.js";

const LINE_COL_REGEX = /:(\d+)(?::(\d+))?$/;

function extractLocation(locStr: string): {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  isNative: boolean;
  isEval: boolean;
} {
  let cleaned = locStr.trim();
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  const isNative = cleaned.includes("[native code]") || cleaned === "native";
  const isEval = cleaned.startsWith("eval at ") || cleaned.includes("eval at ");

  if (isNative) {
    return { fileName: "[native code]", isNative: true, isEval: false };
  }

  const match = LINE_COL_REGEX.exec(cleaned);
  if (match) {
    const lineNum = match[1] ? parseInt(match[1], 10) : undefined;
    const colNum = match[2] ? parseInt(match[2], 10) : undefined;
    const fileName = cleaned.slice(0, match.index);

    return {
      fileName: fileName.length > 0 ? fileName : undefined,
      lineNumber: lineNum,
      columnNumber: colNum,
      isNative: false,
      isEval,
    };
  }

  return {
    fileName: cleaned.length > 0 ? cleaned : undefined,
    lineNumber: undefined,
    columnNumber: undefined,
    isNative: false,
    isEval,
  };
}

/**
 * Parses a single stack trace line into a structured StackFrame object.
 * Returns null if the line cannot be parsed as a stack frame (e.g. error message header).
 */
export function parseStackFrame(line: string): StackFrame | null {
  if (typeof line !== "string") return null;
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  // 1. V8 format: at ...
  if (trimmed.startsWith("at ")) {
    let rest = trimmed.slice(3).trim();
    const isAsync = rest.startsWith("async ");
    if (isAsync) {
      rest = rest.slice(6).trim();
    }

    if (rest.startsWith("new ")) {
      rest = rest.slice(4).trim();
    }

    // Check for "functionName (location)"
    const parenOpen = rest.indexOf("(");
    const parenClose = rest.lastIndexOf(")");

    if (parenOpen > 0 && parenClose === rest.length - 1) {
      const funcName = rest.slice(0, parenOpen).trim();
      const locStr = rest.slice(parenOpen + 1, parenClose).trim();
      const loc = extractLocation(locStr);

      return {
        functionName: funcName || undefined,
        fileName: loc.fileName,
        source: locStr,
        lineNumber: loc.lineNumber,
        columnNumber: loc.columnNumber,
        isNative: loc.isNative,
        isAsync,
        isEval: loc.isEval,
        raw: line,
      };
    }

    // Format: at location
    const loc = extractLocation(rest);
    return {
      functionName: undefined,
      fileName: loc.fileName,
      source: rest,
      lineNumber: loc.lineNumber,
      columnNumber: loc.columnNumber,
      isNative: loc.isNative,
      isAsync,
      isEval: loc.isEval,
      raw: line,
    };
  }

  // 2. Firefox / Safari format: func@loc or @loc
  if (trimmed.includes("@")) {
    const isAsync = trimmed.startsWith("async*");
    const cleaned = isAsync ? trimmed.slice(6) : trimmed;
    const atIdx = cleaned.indexOf("@");
    const funcName = cleaned.slice(0, atIdx).trim();
    const locStr = cleaned.slice(atIdx + 1).trim();
    const loc = extractLocation(locStr);

    return {
      functionName: funcName || undefined,
      fileName: loc.fileName,
      source: locStr,
      lineNumber: loc.lineNumber,
      columnNumber: loc.columnNumber,
      isNative: loc.isNative,
      isAsync,
      isEval: loc.isEval,
      raw: line,
    };
  }

  return null;
}

/**
 * Parses an entire stack trace string or Error object into structured frames.
 */
export function parseStackTrace(input: string | Error): ParsedStackTrace {
  let rawText = "";
  if (input instanceof Error) {
    rawText = input.stack || input.message || String(input);
  } else if (typeof input === "string") {
    rawText = input;
  } else {
    throw new ValidationError("Input must be a stack trace string or an Error object");
  }

  const lines = rawText.split(/\r?\n/);
  const frames: StackFrame[] = [];
  const unparsedLines: string[] = [];
  let message: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const frame = parseStackFrame(line);
    if (frame) {
      frames.push(frame);
    } else {
      if (i === 0 && !message && (trimmed.includes("Error:") || trimmed.includes("Exception"))) {
        message = trimmed;
      } else {
        unparsedLines.push(line);
      }
    }
  }

  return {
    message,
    frames,
    unparsedLines,
  };
}

/**
 * Formats structured stack frames back into a readable stack trace string.
 */
export function formatStackTrace(
  input: ParsedStackTrace | StackFrame[],
  options?: FormatStackTraceOptions
): string {
  const frames = Array.isArray(input) ? input : input.frames;
  const style = options?.style ?? "v8";
  const lines: string[] = [];

  if (!Array.isArray(input) && input.message) {
    lines.push(input.message);
  }

  for (const f of frames) {
    const loc = f.fileName
      ? `${f.fileName}${f.lineNumber !== undefined ? `:${f.lineNumber}` : ""}${f.columnNumber !== undefined ? `:${f.columnNumber}` : ""}`
      : f.source;

    if (style === "firefox") {
      const fn = f.functionName || "";
      const prefix = f.isAsync ? "async*" : "";
      lines.push(`${prefix}${fn}@${loc}`);
    } else if (style === "clean") {
      const fn = f.functionName ? `${f.functionName} ` : "";
      lines.push(`${fn}(${loc})`);
    } else {
      // V8
      const asyncPrefix = f.isAsync ? "async " : "";
      if (f.functionName) {
        lines.push(`    at ${asyncPrefix}${f.functionName} (${loc})`);
      } else {
        lines.push(`    at ${asyncPrefix}${loc}`);
      }
    }
  }

  return lines.join("\n");
}
