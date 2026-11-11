import { describe, expect, it } from "vitest";
import {
  getLuaSyntaxVersion,
  parseLua,
  tokenizeLua,
  validateLua,
} from "../../src/lua-validate/index.js";
import { ParsingError } from "../../src/shared/errors.js";

describe("lua-validate utility", () => {
  it("reports target syntax version as Lua 5.4", () => {
    expect(getLuaSyntaxVersion()).toBe("Lua 5.4");
  });

  it("tokenizes Lua 5.4 keywords, numbers, operators, identifiers, strings, comments", () => {
    const code = `
      -- Single line comment
      --[[ Long comment ]]
      local count = 42 + 0x1F
      local str = "hello" .. 'world' .. [[long string]]
    `;
    const tokens = tokenizeLua(code);
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.some((t) => t.type === "keyword" && t.value === "local")).toBe(true);
    expect(tokens.some((t) => t.type === "number" && t.value === "42")).toBe(true);
    expect(tokens.some((t) => t.type === "operator" && t.value === "..")).toBe(true);
  });

  it("validates valid Lua 5.4 scripts with tables, functions, and control flow", () => {
    const script = `
      local t = { a = 1, [2] = "two", sub = { nested = true } }

      function t:greet(name)
        if name then
          return "Hello, " .. name
        elseif false then
          return nil
        else
          return "Hello stranger"
        end
      end

      local i = 1
      while i < 10 do
        i = i + 1
      end

      repeat
        i = i - 1
      until i == 0

      for x = 1, 5, 1 do
        -- numeric loop
      end

      for k, v in pairs(t) do
        -- generic loop
      end

      ::start::
      if i < 0 then
        goto start
      end
    `;

    const res = validateLua(script);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.version).toBe("Lua 5.4");

    const ast = parseLua(script);
    expect(ast.type).toBe("Block");
  });

  it("supports Lua 5.4 attributes (<const>, <close>)", () => {
    const code = `
      local x <const> = 100
      local f <close> = io.open("file.txt")
    `;
    const res = validateLua(code);
    expect(res.valid).toBe(true);
  });

  it("reports structured syntax errors on invalid Lua code", () => {
    const badCode = `
      local x = 10
      if x > 5 then
        print(x)
      -- missing end
    `;
    const res = validateLua(badCode);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]!.line).toBeGreaterThan(0);
    expect(res.errors[0]!.message).toContain("Expected 'end'");
  });

  it("detects malformed tokens and unclosed strings", () => {
    expect(() => tokenizeLua('local s = "unclosed')).toThrow(ParsingError);
    expect(() => tokenizeLua("--[[ unclosed comment")).toThrow(ParsingError);
  });

  it("detects operator and expression syntax errors", () => {
    const badExpr = "local a = 1 + * 2";
    const res = validateLua(badExpr);
    expect(res.valid).toBe(false);
  });
});
