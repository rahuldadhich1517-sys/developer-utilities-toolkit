export type LuaTokenType =
  | "keyword"
  | "identifier"
  | "number"
  | "string"
  | "operator"
  | "punctuation"
  | "comment"
  | "label"
  | "eof";

export interface LuaToken {
  type: LuaTokenType;
  value: string;
  line: number;
  column: number;
  offset: number;
}

export interface LuaSyntaxError {
  message: string;
  line: number;
  column: number;
  offset: number;
  near?: string;
}

export interface LuaValidationResult {
  valid: boolean;
  version: string;
  tokensCount?: number;
  errors: LuaSyntaxError[];
}

export interface LuaAstNode {
  type: string;
  line: number;
  column: number;
  [key: string]: unknown;
}
