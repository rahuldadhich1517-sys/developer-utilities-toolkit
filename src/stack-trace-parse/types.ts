export interface StackFrame {
  functionName?: string;
  fileName?: string;
  source: string;
  lineNumber?: number;
  columnNumber?: number;
  isNative: boolean;
  isAsync: boolean;
  isEval: boolean;
  raw: string;
}

export interface ParsedStackTrace {
  message?: string;
  frames: StackFrame[];
  unparsedLines: string[];
}

export interface FormatStackTraceOptions {
  style?: "v8" | "firefox" | "clean";
}
