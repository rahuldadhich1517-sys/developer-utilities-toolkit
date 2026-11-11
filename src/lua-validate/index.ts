import { MAX_RECURSION_DEPTH } from "../shared/constants.js";
import { ParsingError } from "../shared/errors.js";
import { assertString } from "../shared/validation.js";
import type {
  LuaAstNode,
  LuaSyntaxError,
  LuaToken,
  LuaValidationResult,
} from "./types.js";

export * from "./types.js";

const LUA_VERSION = "Lua 5.4";

const KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);

/**
 * Returns the target Lua language syntax version supported by this toolkit.
 */
export function getLuaSyntaxVersion(): string {
  return LUA_VERSION;
}

/**
 * Tokenizes Lua 5.4 source code into lexical tokens.
 */
export function tokenizeLua(source: string): LuaToken[] {
  assertString(source, "Lua source code");
  const tokens: LuaToken[] = [];
  let i = 0;
  const len = source.length;
  let line = 1;
  let col = 1;

  function advance(count = 1) {
    for (let c = 0; c < count; c++) {
      if (source[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  while (i < len) {
    const ch = source[i]!;

    // Whitespace
    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    const tokenStartOffset = i;
    const tokenStartLine = line;
    const tokenStartCol = col;

    // Comments: --
    if (ch === "-" && source[i + 1] === "-") {
      advance(2);
      // Check for long comment --[===[ ... ]===]
      if (source[i] === "[") {
        let equals = 0;
        let p = i + 1;
        while (p < len && source[p] === "=") {
          equals++;
          p++;
        }
        if (source[p] === "[") {
          // Long comment
          const bracketLen = equals + 2;
          advance(bracketLen);
          const closingSeq = `]${"=".repeat(equals)}]`;
          const closeIdx = source.indexOf(closingSeq, i);
          if (closeIdx === -1) {
            throw new ParsingError("Unfinished long comment", {
              line: tokenStartLine,
              column: tokenStartCol,
              offset: tokenStartOffset,
            });
          }
          advance(closeIdx - i + closingSeq.length);
          continue;
        }
      }

      // Single line comment
      while (i < len && source[i] !== "\n") {
        advance();
      }
      continue;
    }

    // Long string: [===[ ... ]===]
    if (ch === "[") {
      let equals = 0;
      let p = i + 1;
      while (p < len && source[p] === "=") {
        equals++;
        p++;
      }
      if (source[p] === "[") {
        const bracketLen = equals + 2;
        advance(bracketLen);
        const closingSeq = `]${"=".repeat(equals)}]`;
        const closeIdx = source.indexOf(closingSeq, i);
        if (closeIdx === -1) {
          throw new ParsingError("Unfinished long string", {
            line: tokenStartLine,
            column: tokenStartCol,
            offset: tokenStartOffset,
          });
        }
        const strVal = source.slice(i, closeIdx);
        advance(closeIdx - i + closingSeq.length);
        tokens.push({
          type: "string",
          value: strVal,
          line: tokenStartLine,
          column: tokenStartCol,
          offset: tokenStartOffset,
        });
        continue;
      }
    }

    // String literals: "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      advance();
      let strVal = "";
      let closed = false;

      while (i < len) {
        const sc = source[i]!;
        if (sc === "\\") {
          advance();
          if (i >= len) break;
          strVal += `\\${source[i]!}`;
          advance();
        } else if (sc === quote) {
          advance();
          closed = true;
          break;
        } else if (sc === "\n") {
          throw new ParsingError("Unfinished string literal before newline", {
            line: tokenStartLine,
            column: tokenStartCol,
            offset: tokenStartOffset,
          });
        } else {
          strVal += sc;
          advance();
        }
      }

      if (!closed) {
        throw new ParsingError("Unfinished string literal", {
          line: tokenStartLine,
          column: tokenStartCol,
          offset: tokenStartOffset,
        });
      }

      tokens.push({
        type: "string",
        value: strVal,
        line: tokenStartLine,
        column: tokenStartCol,
        offset: tokenStartOffset,
      });
      continue;
    }

    // Numbers: hex (0x...) or decimal
    if (/\d/.test(ch) || (ch === "." && /\d/.test(source[i + 1] ?? ""))) {
      let numStr = "";
      if (ch === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        numStr += source.slice(i, i + 2);
        advance(2);
        while (i < len && /[0-9a-fA-F.]/.test(source[i]!)) {
          numStr += source[i]!;
          advance();
        }
        if (i < len && (source[i] === "p" || source[i] === "P")) {
          numStr += source[i]!;
          advance();
          if (i < len && (source[i] === "+" || source[i] === "-")) {
            numStr += source[i]!;
            advance();
          }
          while (i < len && /\d/.test(source[i]!)) {
            numStr += source[i]!;
            advance();
          }
        }
      } else {
        while (i < len && /[\d.]/.test(source[i]!)) {
          numStr += source[i]!;
          advance();
        }
        if (i < len && (source[i] === "e" || source[i] === "E")) {
          numStr += source[i]!;
          advance();
          if (i < len && (source[i] === "+" || source[i] === "-")) {
            numStr += source[i]!;
            advance();
          }
          while (i < len && /\d/.test(source[i]!)) {
            numStr += source[i]!;
            advance();
          }
        }
      }

      tokens.push({
        type: "number",
        value: numStr,
        line: tokenStartLine,
        column: tokenStartCol,
        offset: tokenStartOffset,
      });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = "";
      while (i < len && /[a-zA-Z0-9_]/.test(source[i]!)) {
        idStr += source[i]!;
        advance();
      }
      tokens.push({
        type: KEYWORDS.has(idStr) ? "keyword" : "identifier",
        value: idStr,
        line: tokenStartLine,
        column: tokenStartCol,
        offset: tokenStartOffset,
      });
      continue;
    }

    // Labels: ::label::
    if (ch === ":" && source[i + 1] === ":") {
      tokens.push({
        type: "punctuation",
        value: "::",
        line: tokenStartLine,
        column: tokenStartCol,
        offset: tokenStartOffset,
      });
      advance(2);
      continue;
    }

    // Multi-char operators
    const twoChars = source.slice(i, i + 2);
    const threeChars = source.slice(i, i + 3);

    if (threeChars === "...") {
      tokens.push({ type: "punctuation", value: "...", line: tokenStartLine, column: tokenStartCol, offset: tokenStartOffset });
      advance(3);
      continue;
    }

    if (["//", ">>", "<<", "..", "==", "~=", "<=", ">="].includes(twoChars)) {
      tokens.push({ type: "operator", value: twoChars, line: tokenStartLine, column: tokenStartCol, offset: tokenStartOffset });
      advance(2);
      continue;
    }

    // Single char operators & punctuation
    if ("+-*/%^#&~|<>=~".includes(ch)) {
      tokens.push({ type: "operator", value: ch, line: tokenStartLine, column: tokenStartCol, offset: tokenStartOffset });
      advance(1);
      continue;
    }

    if ("();:,.{}[]".includes(ch)) {
      tokens.push({ type: "punctuation", value: ch, line: tokenStartLine, column: tokenStartCol, offset: tokenStartOffset });
      advance(1);
      continue;
    }

    throw new ParsingError(`Unexpected character: "${ch}"`, {
      line: tokenStartLine,
      column: tokenStartCol,
      offset: tokenStartOffset,
    });
  }

  tokens.push({
    type: "eof",
    value: "<eof>",
    line,
    column: col,
    offset: i,
  });

  return tokens;
}

class LuaParser {
  private tokens: LuaToken[];
  private current = 0;
  private depth = 0;

  constructor(tokens: LuaToken[]) {
    this.tokens = tokens;
  }

  private peek(): LuaToken {
    return this.tokens[this.current] ?? this.tokens[this.tokens.length - 1]!;
  }

  private isAtEnd(): boolean {
    return this.peek().type === "eof";
  }

  private check(value: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().value === value;
  }

  private match(...values: string[]): boolean {
    for (const val of values) {
      if (this.check(val)) {
        this.current++;
        return true;
      }
    }
    return false;
  }

  private consume(expected: string, message: string): LuaToken {
    if (this.check(expected)) {
      return this.tokens[this.current++]!;
    }
    const t = this.peek();
    throw new ParsingError(`${message}. Got '${t.value}'`, {
      line: t.line,
      column: t.column,
      offset: t.offset,
    });
  }

  private withDepth<T>(fn: () => T): T {
    this.depth++;
    if (this.depth > MAX_RECURSION_DEPTH) {
      const t = this.peek();
      throw new ParsingError("Maximum Lua parser recursion limit exceeded", {
        line: t.line,
        column: t.column,
        offset: t.offset,
      });
    }
    try {
      return fn();
    } finally {
      this.depth--;
    }
  }

  parse(): LuaAstNode {
    return this.parseBlock();
  }

  private parseBlock(): LuaAstNode {
    return this.withDepth(() => {
      const start = this.peek();
      const statements: LuaAstNode[] = [];

      while (!this.isAtEnd() && !this.checkBlockEnd()) {
        if (this.match(";")) continue;
        const stat = this.parseStatement();
        statements.push(stat);
        this.match(";"); // optional semicolon
      }

      if (this.check("return")) {
        statements.push(this.parseReturnStatement());
        this.match(";");
      }

      return {
        type: "Block",
        line: start.line,
        column: start.column,
        statements,
      };
    });
  }

  private checkBlockEnd(): boolean {
    const val = this.peek().value;
    return ["end", "else", "elseif", "until", "return"].includes(val);
  }

  private parseStatement(): LuaAstNode {
    const t = this.peek();

    if (this.match("local")) {
      if (this.match("function")) {
        const nameToken = this.consumeIdentifier("Expected function name after 'local function'");
        const body = this.parseFuncBody();
        return { type: "LocalFunctionDeclaration", name: nameToken.value, body, line: t.line, column: t.column };
      }
      return this.parseLocalDeclaration(t);
    }

    if (this.match("function")) {
      const nameNode = this.parseFunctionName();
      const body = this.parseFuncBody();
      return { type: "FunctionDeclaration", name: nameNode, body, line: t.line, column: t.column };
    }

    if (this.match("if")) {
      return this.parseIfStatement(t);
    }

    if (this.match("while")) {
      const condition = this.parseExpression();
      this.consume("do", "Expected 'do' after while condition");
      const body = this.parseBlock();
      this.consume("end", "Expected 'end' to close while loop");
      return { type: "WhileStatement", condition, body, line: t.line, column: t.column };
    }

    if (this.match("repeat")) {
      const body = this.parseBlock();
      this.consume("until", "Expected 'until' after repeat block");
      const condition = this.parseExpression();
      return { type: "RepeatStatement", body, condition, line: t.line, column: t.column };
    }

    if (this.match("for")) {
      return this.parseForStatement(t);
    }

    if (this.match("do")) {
      const body = this.parseBlock();
      this.consume("end", "Expected 'end' to close 'do' block");
      return { type: "DoStatement", body, line: t.line, column: t.column };
    }

    if (this.match("break")) {
      return { type: "BreakStatement", line: t.line, column: t.column };
    }

    if (this.match("goto")) {
      const label = this.consumeIdentifier("Expected label name after 'goto'");
      return { type: "GotoStatement", label: label.value, line: t.line, column: t.column };
    }

    if (this.match("::")) {
      const label = this.consumeIdentifier("Expected label name after '::'");
      this.consume("::", "Expected '::' to close label declaration");
      return { type: "LabelStatement", label: label.value, line: t.line, column: t.column };
    }

    // Assignment or function call
    return this.parseAssignmentOrCall();
  }

  private parseReturnStatement(): LuaAstNode {
    const t = this.consume("return", "Expected 'return'");
    const expressions: LuaAstNode[] = [];
    if (!this.isAtEnd() && !this.check(";") && !this.check("end") && !this.check("until") && !this.check("else") && !this.check("elseif")) {
      expressions.push(...this.parseExpressionList());
    }
    return { type: "ReturnStatement", expressions, line: t.line, column: t.column };
  }

  private parseIfStatement(t: LuaToken): LuaAstNode {
    const condition = this.parseExpression();
    this.consume("then", "Expected 'then' after if condition");
    const thenBlock = this.parseBlock();

    const elseifs: Array<{ condition: LuaAstNode; block: LuaAstNode }> = [];
    while (this.match("elseif")) {
      const cond = this.parseExpression();
      this.consume("then", "Expected 'then' after elseif condition");
      const blk = this.parseBlock();
      elseifs.push({ condition: cond, block: blk });
    }

    let elseBlock: LuaAstNode | undefined;
    if (this.match("else")) {
      elseBlock = this.parseBlock();
    }

    this.consume("end", "Expected 'end' to close 'if' statement");

    return {
      type: "IfStatement",
      condition,
      thenBlock,
      elseifs,
      elseBlock,
      line: t.line,
      column: t.column,
    };
  }

  private parseForStatement(t: LuaToken): LuaAstNode {
    const firstVar = this.consumeIdentifier("Expected variable name after 'for'");

    if (this.match("=")) {
      // Numeric for
      const start = this.parseExpression();
      this.consume(",", "Expected ',' after numeric for start value");
      const end = this.parseExpression();
      let step: LuaAstNode | undefined;
      if (this.match(",")) {
        step = this.parseExpression();
      }
      this.consume("do", "Expected 'do' in numeric for loop");
      const body = this.parseBlock();
      this.consume("end", "Expected 'end' to close numeric for loop");
      return {
        type: "NumericForStatement",
        variable: firstVar.value,
        start,
        end,
        step,
        body,
        line: t.line,
        column: t.column,
      };
    }

    // Generic for
    const vars: string[] = [firstVar.value];
    while (this.match(",")) {
      vars.push(this.consumeIdentifier("Expected variable name in generic for").value);
    }
    this.consume("in", "Expected 'in' in generic for loop");
    const expressions = this.parseExpressionList();
    this.consume("do", "Expected 'do' in generic for loop");
    const body = this.parseBlock();
    this.consume("end", "Expected 'end' to close generic for loop");

    return {
      type: "GenericForStatement",
      variables: vars,
      expressions,
      body,
      line: t.line,
      column: t.column,
    };
  }

  private parseLocalDeclaration(t: LuaToken): LuaAstNode {
    const variables: Array<{ name: string; attribute?: string }> = [];

    do {
      const name = this.consumeIdentifier("Expected variable name in local declaration");
      let attribute: string | undefined;
      if (this.match("<")) {
        attribute = this.consumeIdentifier("Expected attribute name (<const> or <close>)").value;
        this.consume(">", "Expected '>' to close attribute");
      }
      variables.push({ name: name.value, attribute });
    } while (this.match(","));

    let init: LuaAstNode[] = [];
    if (this.match("=")) {
      init = this.parseExpressionList();
    }

    return { type: "LocalDeclaration", variables, init, line: t.line, column: t.column };
  }

  private parseFunctionName(): LuaAstNode {
    let nameNode: LuaAstNode = {
      type: "Identifier",
      name: this.consumeIdentifier("Expected function name").value,
      line: this.peek().line,
      column: this.peek().column,
    };

    while (this.match(".")) {
      const prop = this.consumeIdentifier("Expected property name after '.'");
      nameNode = {
        type: "MemberExpression",
        base: nameNode,
        property: prop.value,
        indexer: ".",
        line: prop.line,
        column: prop.column,
      };
    }

    if (this.match(":")) {
      const method = this.consumeIdentifier("Expected method name after ':'");
      nameNode = {
        type: "MemberExpression",
        base: nameNode,
        property: method.value,
        indexer: ":",
        line: method.line,
        column: method.column,
      };
    }

    return nameNode;
  }

  private parseFuncBody(): LuaAstNode {
    this.consume("(", "Expected '(' for function parameter list");
    const params: string[] = [];
    let isVararg = false;

    if (!this.check(")")) {
      do {
        if (this.match("...")) {
          isVararg = true;
          break;
        }
        params.push(this.consumeIdentifier("Expected parameter name").value);
      } while (this.match(","));
    }

    this.consume(")", "Expected ')' to close parameter list");
    const body = this.parseBlock();
    this.consume("end", "Expected 'end' to close function body");

    return { type: "FunctionBody", params, isVararg, body, line: this.peek().line, column: this.peek().column };
  }

  private parseAssignmentOrCall(): LuaAstNode {
    const expr = this.parsePrefixExpression();

    if (this.check("=") || this.check(",")) {
      // Assignment statement
      const targets: LuaAstNode[] = [expr];
      while (this.match(",")) {
        targets.push(this.parsePrefixExpression());
      }
      this.consume("=", "Expected '=' in assignment");
      const values = this.parseExpressionList();
      return { type: "AssignmentStatement", targets, values, line: expr.line, column: expr.column };
    }

    // Must be a function call
    if (expr.type !== "CallExpression" && expr.type !== "MethodCallExpression") {
      throw new ParsingError(`Syntax error: unexpected expression or missing assignment near '${expr.type}'`, {
        line: expr.line,
        column: expr.column,
      });
    }

    return { type: "CallStatement", expression: expr, line: expr.line, column: expr.column };
  }

  private parseExpressionList(): LuaAstNode[] {
    const list: LuaAstNode[] = [this.parseExpression()];
    while (this.match(",")) {
      list.push(this.parseExpression());
    }
    return list;
  }

  private parseExpression(): LuaAstNode {
    return this.parseSubExpression(0);
  }

  private parseSubExpression(minPrecedence: number): LuaAstNode {
    return this.withDepth(() => {
      let left = this.parseUnaryExpression();

      while (true) {
        const opToken = this.peek();
        const op = opToken.value;
        const precedence = this.getBinaryPrecedence(op);
        if (precedence === null || precedence < minPrecedence) {
          break;
        }

        this.current++; // consume op
        const isRightAssoc = op === "^" || op === "..";
        const nextMin = isRightAssoc ? precedence : precedence + 1;
        const right = this.parseSubExpression(nextMin);

        left = {
          type: "BinaryExpression",
          operator: op,
          left,
          right,
          line: opToken.line,
          column: opToken.column,
        };
      }

      return left;
    });
  }

  private getBinaryPrecedence(op: string): number | null {
    switch (op) {
      case "or":
        return 1;
      case "and":
        return 2;
      case "<":
      case ">":
      case "<=":
      case ">=":
      case "~=":
      case "==":
        return 3;
      case "|":
        return 4;
      case "~":
        return 5;
      case "&":
        return 6;
      case "<<":
      case ">>":
        return 7;
      case "..":
        return 8;
      case "+":
      case "-":
        return 9;
      case "*":
      case "/":
      case "//":
      case "%":
        return 10;
      case "^":
        return 12;
      default:
        return null;
    }
  }

  private parseUnaryExpression(): LuaAstNode {
    const t = this.peek();
    if (["not", "#", "-", "~"].includes(t.value)) {
      this.current++;
      const argument = this.parseSubExpression(11); // Unary precedence 11
      return { type: "UnaryExpression", operator: t.value, argument, line: t.line, column: t.column };
    }
    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): LuaAstNode {
    const t = this.peek();

    if (t.type === "number") {
      this.current++;
      return { type: "NumericLiteral", value: t.value, line: t.line, column: t.column };
    }

    if (t.type === "string") {
      this.current++;
      return { type: "StringLiteral", value: t.value, line: t.line, column: t.column };
    }

    if (t.value === "nil") {
      this.current++;
      return { type: "NilLiteral", line: t.line, column: t.column };
    }

    if (t.value === "true" || t.value === "false") {
      this.current++;
      return { type: "BooleanLiteral", value: t.value === "true", line: t.line, column: t.column };
    }

    if (t.value === "...") {
      this.current++;
      return { type: "VarargLiteral", line: t.line, column: t.column };
    }

    if (this.match("function")) {
      const body = this.parseFuncBody();
      return { type: "AnonymousFunction", body, line: t.line, column: t.column };
    }

    if (this.match("{")) {
      return this.parseTableConstructor(t);
    }

    return this.parsePrefixExpression();
  }

  private parseTableConstructor(t: LuaToken): LuaAstNode {
    const fields: LuaAstNode[] = [];

    while (!this.match("}")) {
      if (this.isAtEnd()) {
        throw new ParsingError("Unclosed table constructor", { line: t.line, column: t.column });
      }

      if (this.match("[")) {
        const key = this.parseExpression();
        this.consume("]", "Expected ']' after table key expression");
        this.consume("=", "Expected '=' after table key");
        const val = this.parseExpression();
        fields.push({ type: "TableKeyField", key, value: val, line: key.line, column: key.column });
      } else if (this.peek().type === "identifier" && this.tokens[this.current + 1]?.value === "=") {
        const keyToken = this.consumeIdentifier("Expected field name");
        this.consume("=", "Expected '='");
        const val = this.parseExpression();
        fields.push({ type: "TableNamedField", name: keyToken.value, value: val, line: keyToken.line, column: keyToken.column });
      } else {
        const val = this.parseExpression();
        fields.push({ type: "TableValueField", value: val, line: val.line, column: val.column });
      }

      if (!this.match(",", ";")) {
        this.consume("}", "Expected '}' to close table constructor");
        break;
      }
    }

    return { type: "TableConstructor", fields, line: t.line, column: t.column };
  }

  private parsePrefixExpression(): LuaAstNode {
    let node: LuaAstNode;
    const t = this.peek();

    if (this.match("(")) {
      node = this.parseExpression();
      this.consume(")", "Expected ')' to match '('");
    } else if (t.type === "identifier") {
      this.current++;
      node = { type: "Identifier", name: t.value, line: t.line, column: t.column };
    } else {
      throw new ParsingError(`Unexpected token in expression: '${t.value}'`, {
        line: t.line,
        column: t.column,
        offset: t.offset,
      });
    }

    while (true) {
      if (this.match("[")) {
        const indexExpr = this.parseExpression();
        this.consume("]", "Expected ']' after index");
        node = { type: "IndexExpression", base: node, index: indexExpr, line: node.line, column: node.column };
      } else if (this.match(".")) {
        const prop = this.consumeIdentifier("Expected property name after '.'");
        node = { type: "MemberExpression", base: node, property: prop.value, indexer: ".", line: prop.line, column: prop.column };
      } else if (this.match(":")) {
        const method = this.consumeIdentifier("Expected method name after ':'");
        const args = this.parseCallArgs();
        node = { type: "MethodCallExpression", base: node, method: method.value, args, line: method.line, column: method.column };
      } else if (this.check("(") || this.check("{") || this.peek().type === "string") {
        const args = this.parseCallArgs();
        node = { type: "CallExpression", base: node, args, line: node.line, column: node.column };
      } else {
        break;
      }
    }

    return node;
  }

  private parseCallArgs(): LuaAstNode[] {
    const t = this.peek();
    if (this.match("(")) {
      const args: LuaAstNode[] = [];
      if (!this.check(")")) {
        args.push(...this.parseExpressionList());
      }
      this.consume(")", "Expected ')' to close arguments");
      return args;
    }
    if (this.match("{")) {
      return [this.parseTableConstructor(t)];
    }
    if (t.type === "string") {
      this.current++;
      return [{ type: "StringLiteral", value: t.value, line: t.line, column: t.column }];
    }
    throw new ParsingError(`Expected call arguments, got '${t.value}'`, { line: t.line, column: t.column });
  }

  private consumeIdentifier(msg: string): LuaToken {
    const t = this.peek();
    if (t.type !== "identifier") {
      throw new ParsingError(`${msg}. Got '${t.value}'`, { line: t.line, column: t.column, offset: t.offset });
    }
    return this.tokens[this.current++]!;
  }
}

/**
 * Parses Lua 5.4 source code into an Abstract Syntax Tree (AST).
 */
export function parseLua(source: string): LuaAstNode {
  const tokens = tokenizeLua(source);
  const parser = new LuaParser(tokens);
  return parser.parse();
}

/**
 * Validates Lua source code for syntax errors.
 * Returns structured validation result including syntax errors or success confirmation.
 */
export function validateLua(source: string): LuaValidationResult {
  try {
    assertString(source, "Lua source code");
    const tokens = tokenizeLua(source);
    const parser = new LuaParser(tokens);
    parser.parse();

    return {
      valid: true,
      version: LUA_VERSION,
      tokensCount: tokens.length,
      errors: [],
    };
  } catch (err) {
    const error: LuaSyntaxError = {
      message: err instanceof Error ? err.message : String(err),
      line: (err instanceof ParsingError && err.line) || 1,
      column: (err instanceof ParsingError && err.column) || 1,
      offset: (err instanceof ParsingError && err.offset) || 0,
    };

    return {
      valid: false,
      version: LUA_VERSION,
      errors: [error],
    };
  }
}
