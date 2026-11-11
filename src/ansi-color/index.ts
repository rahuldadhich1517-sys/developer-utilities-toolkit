import { escapeHtml } from "../shared/html-escape.js";
import { ValidationError } from "../shared/errors.js";
import type {
  AnsiFormatOptions,
  AnsiStyleName,
  AnsiToHtmlOptions,
  ColorInput,
  RgbColor,
  StandardColorName,
} from "./types.js";

export * from "./types.js";

const ESC = "\x1b[";
const RESET_ALL = "\x1b[0m";

const STYLES: Record<AnsiStyleName, number> = {
  reset: 0,
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  blink: 5,
  inverse: 7,
  hidden: 8,
  strikethrough: 9,
};

const STANDARD_FG: Record<StandardColorName, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  grey: 90,
  default: 39,
};

const BRIGHT_FG: Record<string, number> = {
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};

const STANDARD_BG: Record<StandardColorName, number> = {
  black: 40,
  red: 41,
  green: 42,
  yellow: 43,
  blue: 44,
  magenta: 45,
  cyan: 46,
  white: 47,
  gray: 100,
  grey: 100,
  default: 49,
};

const BRIGHT_BG: Record<string, number> = {
  brightRed: 101,
  brightGreen: 102,
  brightYellow: 103,
  brightBlue: 104,
  brightMagenta: 105,
  brightCyan: 106,
  brightWhite: 107,
};

function parseHexColor(hex: string): RgbColor {
  let cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new ValidationError(`Invalid hex color string: "${hex}"`);
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function resolveColorCode(color: ColorInput, isBackground = false): string {
  if (typeof color === "number") {
    if (color < 0 || color > 255 || !Number.isInteger(color)) {
      throw new ValidationError(`256-color code must be an integer between 0 and 255. Got: ${color}`);
    }
    return `${isBackground ? 48 : 38};5;${color}`;
  }

  if (typeof color === "object" && color !== null && "r" in color && "g" in color && "b" in color) {
    const { r, g, b } = color as RgbColor;
    if ([r, g, b].some((c) => typeof c !== "number" || c < 0 || c > 255 || Number.isNaN(c))) {
      throw new ValidationError(`RGB color components must be between 0 and 255. Got: {r: ${r}, g: ${g}, b: ${b}}`);
    }
    return `${isBackground ? 48 : 38};2;${Math.round(r)};${Math.round(g)};${Math.round(b)}`;
  }

  if (typeof color === "string") {
    if (color.startsWith("#")) {
      const rgb = parseHexColor(color);
      return resolveColorCode(rgb, isBackground);
    }

    if (isBackground) {
      if (color in STANDARD_BG) return String(STANDARD_BG[color as StandardColorName]);
      if (color in BRIGHT_BG) return String(BRIGHT_BG[color]);
    } else {
      if (color in STANDARD_FG) return String(STANDARD_FG[color as StandardColorName]);
      if (color in BRIGHT_FG) return String(BRIGHT_FG[color]);
    }

    throw new ValidationError(`Unknown color name or format: "${color}"`);
  }

  throw new ValidationError("Invalid color input provided");
}

/**
 * Returns the ANSI escape sequence for a foreground color.
 */
export function ansiColor(color: ColorInput): string {
  return `${ESC}${resolveColorCode(color, false)}m`;
}

/**
 * Returns the ANSI escape sequence for a background color.
 */
export function ansiBackground(color: ColorInput): string {
  return `${ESC}${resolveColorCode(color, true)}m`;
}

/**
 * Returns the ANSI escape sequence for a text style.
 */
export function ansiStyle(style: AnsiStyleName): string {
  const code = STYLES[style];
  if (code === undefined) {
    throw new ValidationError(`Unknown ANSI style: "${style}"`);
  }
  return `${ESC}${code}m`;
}

/**
 * Wraps text with ANSI formatting (color, background, styles) and appends reset.
 */
export function colorizeAnsi(text: string, options: AnsiFormatOptions): string {
  if (typeof text !== "string") {
    throw new ValidationError("Expected text to colorize to be a string");
  }

  const codes: string[] = [];

  if (options.style) {
    const styles = Array.isArray(options.style) ? options.style : [options.style];
    for (const s of styles) {
      const code = STYLES[s];
      if (code !== undefined) codes.push(String(code));
    }
  }

  if (options.color !== undefined) {
    codes.push(resolveColorCode(options.color, false));
  }

  if (options.background !== undefined) {
    codes.push(resolveColorCode(options.background, true));
  }

  if (codes.length === 0) return text;
  return `${ESC}${codes.join(";")}m${text}${RESET_ALL}`;
}

/**
 * Strips all ANSI escape sequences from text.
 */
export function stripAnsi(text: string): string {
  if (typeof text !== "string") return "";
  // Matches all ANSI SGR and cursor/CSI escape sequences
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "");
}

/**
 * Checks whether the current runtime environment supports ANSI colors.
 */
export function supportsAnsiColor(): boolean {
  // If in Node.js environment
  if (typeof process !== "undefined" && process?.env) {
    if (process.env.NO_COLOR || process.env.NODE_DISABLE_COLORS === "1") {
      return false;
    }
    if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") {
      return true;
    }
    if (process.stdout && "isTTY" in process.stdout && Boolean(process.stdout.isTTY)) {
      return true;
    }
    if (process.env.TERM && process.env.TERM !== "dumb") {
      return true;
    }
    if (process.env.COLORTERM) {
      return true;
    }
  }
  // Modern browsers support console styling
  if (typeof window !== "undefined" || typeof navigator !== "undefined") {
    return true;
  }
  return false;
}

const HTML_COLOR_MAP: Record<number, string> = {
  30: "#000000",
  31: "#cd3131",
  32: "#0dbc79",
  33: "#e5e510",
  34: "#2472c8",
  35: "#bc3fbc",
  36: "#11a8cd",
  37: "#e5e5e5",
  90: "#666666",
  91: "#f14c4c",
  92: "#23d18b",
  93: "#f5f543",
  94: "#3b8eea",
  95: "#d670d6",
  96: "#29b8db",
  97: "#ffffff",
};

const HTML_BG_MAP: Record<number, string> = {
  40: "#000000",
  41: "#cd3131",
  42: "#0dbc79",
  43: "#e5e510",
  44: "#2472c8",
  45: "#bc3fbc",
  46: "#11a8cd",
  47: "#e5e5e5",
  100: "#666666",
  101: "#f14c4c",
  102: "#23d18b",
  103: "#f5f543",
  104: "#3b8eea",
  105: "#d670d6",
  106: "#29b8db",
  107: "#ffffff",
};

/**
 * Converts text containing ANSI escape codes into safe HTML.
 * Escapes all HTML special characters in the text.
 */
export function ansiToHtml(text: string, _options?: AnsiToHtmlOptions): string {
  if (typeof text !== "string") return "";

  // Split by ANSI escape sequences
  const parts = text.split(/(\x1b\[[0-9;]*m)/g);
  let html = "";
  let openSpans = 0;

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("\x1b[") && part.endsWith("m")) {
      const codeStr = part.slice(2, -1);
      const codes = codeStr.length === 0 ? [0] : codeStr.split(";").map(Number);

      let i = 0;
      while (i < codes.length) {
        const c = codes[i]!;

        if (c === 0) {
          // Reset all
          while (openSpans > 0) {
            html += "</span>";
            openSpans--;
          }
          i++;
        } else if (c === 1) {
          html += '<span style="font-weight:bold;">';
          openSpans++;
          i++;
        } else if (c === 2) {
          html += '<span style="opacity:0.7;">';
          openSpans++;
          i++;
        } else if (c === 3) {
          html += '<span style="font-style:italic;">';
          openSpans++;
          i++;
        } else if (c === 4) {
          html += '<span style="text-decoration:underline;">';
          openSpans++;
          i++;
        } else if (c === 9) {
          html += '<span style="text-decoration:line-through;">';
          openSpans++;
          i++;
        } else if (c >= 30 && c <= 37) {
          const color = HTML_COLOR_MAP[c];
          html += `<span style="color:${color};">`;
          openSpans++;
          i++;
        } else if (c === 39) {
          // default fg
          i++;
        } else if (c >= 40 && c <= 47) {
          const bg = HTML_BG_MAP[c];
          html += `<span style="background-color:${bg};">`;
          openSpans++;
          i++;
        } else if (c === 49) {
          // default bg
          i++;
        } else if (c >= 90 && c <= 97) {
          const color = HTML_COLOR_MAP[c];
          html += `<span style="color:${color};">`;
          openSpans++;
          i++;
        } else if (c >= 100 && c <= 107) {
          const bg = HTML_BG_MAP[c];
          html += `<span style="background-color:${bg};">`;
          openSpans++;
          i++;
        } else if (c === 38 || c === 48) {
          const isBg = c === 48;
          const mode = codes[i + 1];
          if (mode === 5 && i + 2 < codes.length) {
            // 256 color
            const n = codes[i + 2]!;
            const hex = HTML_COLOR_MAP[n] ?? `rgb(${n},${n},${n})`;
            html += `<span style="${isBg ? "background-color" : "color"}:${hex};">`;
            openSpans++;
            i += 3;
          } else if (mode === 2 && i + 4 < codes.length) {
            // Truecolor RGB
            const r = codes[i + 2]!;
            const g = codes[i + 3]!;
            const b = codes[i + 4]!;
            html += `<span style="${isBg ? "background-color" : "color"}:rgb(${r},${g},${b});">`;
            openSpans++;
            i += 5;
          } else {
            i++;
          }
        } else {
          i++;
        }
      }
    } else {
      // Regular text -> escape HTML!
      html += escapeHtml(part);
    }
  }

  while (openSpans > 0) {
    html += "</span>";
    openSpans--;
  }

  return html;
}
