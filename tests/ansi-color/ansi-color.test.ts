import { describe, expect, it } from "vitest";
import {
  ansiBackground,
  ansiColor,
  ansiStyle,
  ansiToHtml,
  colorizeAnsi,
  stripAnsi,
  supportsAnsiColor,
} from "../../src/ansi-color/index.js";
import { ValidationError } from "../../src/shared/errors.js";

describe("ansi-color utility", () => {
  it("generates standard ANSI color escape codes", () => {
    expect(ansiColor("red")).toBe("\x1b[31m");
    expect(ansiColor("green")).toBe("\x1b[32m");
    expect(ansiColor("blue")).toBe("\x1b[34m");
    expect(ansiBackground("red")).toBe("\x1b[41m");
    expect(ansiBackground("yellow")).toBe("\x1b[43m");
    expect(ansiColor("brightRed")).toBe("\x1b[91m");
    expect(ansiBackground("brightCyan")).toBe("\x1b[106m");
  });

  it("supports 256-color mode", () => {
    expect(ansiColor(196)).toBe("\x1b[38;5;196m");
    expect(ansiBackground(82)).toBe("\x1b[48;5;82m");
    expect(() => ansiColor(300)).toThrow(ValidationError);
    expect(() => ansiColor(-1)).toThrow(ValidationError);
  });

  it("supports truecolor RGB mode and hex colors", () => {
    expect(ansiColor({ r: 255, g: 100, b: 50 })).toBe("\x1b[38;2;255;100;50m");
    expect(ansiBackground({ r: 0, g: 128, b: 255 })).toBe("\x1b[48;2;0;128;255m");
    expect(ansiColor("#ff0000")).toBe("\x1b[38;2;255;0;0m");
    expect(ansiColor("#0f0")).toBe("\x1b[38;2;0;255;0m");
    expect(() => ansiColor("#invalid")).toThrow(ValidationError);
    expect(() => ansiColor({ r: 300, g: 0, b: 0 })).toThrow(ValidationError);
  });

  it("generates style sequences", () => {
    expect(ansiStyle("bold")).toBe("\x1b[1m");
    expect(ansiStyle("dim")).toBe("\x1b[2m");
    expect(ansiStyle("italic")).toBe("\x1b[3m");
    expect(ansiStyle("underline")).toBe("\x1b[4m");
    expect(ansiStyle("strikethrough")).toBe("\x1b[9m");
    expect(ansiStyle("reset")).toBe("\x1b[0m");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => ansiStyle("not-a-style" as any)).toThrow(ValidationError);
  });

  it("colorizes text with nested styles and resets", () => {
    const formatted = colorizeAnsi("Hello World", {
      color: "red",
      background: "yellow",
      style: ["bold", "underline"],
    });

    expect(formatted.startsWith("\x1b[")).toBe(true);
    expect(formatted.endsWith("\x1b[0m")).toBe(true);
    expect(formatted).toContain("Hello World");

    // Empty options returns original text
    expect(colorizeAnsi("Plain", {})).toBe("Plain");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => colorizeAnsi(123 as any, {})).toThrow(ValidationError);
  });

  it("safely strips ANSI codes", () => {
    const colored = "\x1b[31;1mBold Red\x1b[0m normal \x1b[38;2;255;0;0mTruecolor\x1b[0m";
    expect(stripAnsi(colored)).toBe("Bold Red normal Truecolor");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(stripAnsi(null as any)).toBe("");
  });

  it("checks terminal color support", () => {
    const supported = supportsAnsiColor();
    expect(typeof supported).toBe("boolean");
  });

  it("converts ANSI sequences to safe HTML and escapes raw content", () => {
    const input = "\x1b[31m<script>alert('xss')</script>\x1b[0m & \x1b[1m\"Bold\"\x1b[0m \x1b[2mDim\x1b[0m \x1b[3mItalic\x1b[0m \x1b[4mUnder\x1b[0m \x1b[9mStrike\x1b[0m \x1b[39mDefaultFg\x1b[49mDefaultBg\x1b[91mBrightFg\x1b[101mBrightBg\x1b[0m";
    const html = ansiToHtml(input);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;Bold&quot;");
    expect(html).toContain('<span style="color:#cd3131;">');
    expect(html).toContain('<span style="font-weight:bold;">');
    expect(html).toContain('<span style="opacity:0.7;">');
    expect(html).toContain('<span style="font-style:italic;">');
    expect(html).toContain('<span style="text-decoration:underline;">');
    expect(html).toContain('<span style="text-decoration:line-through;">');
    expect(html).toContain("</span>");
  });

  it("handles unknown or invalid color names", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => ansiColor("not-a-color" as any)).toThrow(ValidationError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => ansiBackground("not-a-color" as any)).toThrow(ValidationError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => ansiColor(true as any)).toThrow(ValidationError);
  });

  it("handles complex ANSI to HTML with 256 colors and RGB", () => {
    const input = "\x1b[38;5;31m256color\x1b[0m \x1b[38;2;10;20;30mRGBcolor\x1b[0m";
    const html = ansiToHtml(input);
    expect(html).toContain("256color");
    expect(html).toContain("rgb(10,20,30)");
  });
});
