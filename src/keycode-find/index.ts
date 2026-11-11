import { ValidationError } from "../shared/errors.js";
import type {
  KeyCategory,
  NormalizedKeyEvent,
  PartialKeyboardEvent,
} from "./types.js";

export * from "./types.js";

function classifyKey(key: string, code: string): KeyCategory {
  if (code.startsWith("F") && /^F\d+$/.test(code)) return "function";
  if (["Control", "Shift", "Alt", "Meta", "CapsLock", "AltGraph", "NumLock", "ScrollLock"].includes(key)) return "modifier";
  if (code.startsWith("Numpad")) return "numpad";
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(key)) return "navigation";
  if (["Backspace", "Delete", "Insert", "Escape"].includes(key)) return "editing";
  if ([" ", "Enter", "Tab"].includes(key) || code === "Space") return "whitespace";
  if (/^[a-zA-Z]$/.test(key) || code.startsWith("Key")) return "letter";
  if (/^[0-9]$/.test(key) || code.startsWith("Digit")) return "number";
  return "special";
}

function buildShortcutString(modifiers: string[], key: string): string {
  const parts = [...modifiers];
  if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
    const displayKey = key === " " ? "Space" : key.length === 1 ? key.toUpperCase() : key;
    parts.push(displayKey);
  }
  return parts.join("+");
}

/**
 * Returns whether a specific modifier key is active in the keyboard event.
 */
export function getModifierState(
  event: PartialKeyboardEvent,
  modifier: string
): boolean {
  if (!event || typeof event !== "object") return false;

  if (typeof event.getModifierState === "function") {
    try {
      return Boolean(event.getModifierState(modifier));
    } catch {
      // Fall through to manual check
    }
  }

  const modLower = modifier.toLowerCase();
  switch (modLower) {
    case "control":
    case "ctrl":
      return Boolean(event.ctrlKey);
    case "shift":
      return Boolean(event.shiftKey);
    case "alt":
      return Boolean(event.altKey);
    case "meta":
    case "os":
    case "cmd":
    case "command":
      return Boolean(event.metaKey);
    default:
      return false;
  }
}

/**
 * Normalizes keyboard event data into a complete, structured keyboard information object.
 */
export function getKeyEventInfo(event: PartialKeyboardEvent): NormalizedKeyEvent {
  if (!event || typeof event !== "object") {
    throw new ValidationError("Keyboard event must be an object");
  }

  const key = event.key ?? "Unidentified";
  const code = event.code ?? (key.length === 1 ? `Key${key.toUpperCase()}` : "Unidentified");
  const keyCode = typeof event.keyCode === "number" ? event.keyCode : 0;
  const which = typeof event.which === "number" ? event.which : keyCode;
  const location = typeof event.location === "number" ? event.location : 0;
  const repeat = Boolean(event.repeat);
  const isComposing = Boolean(event.isComposing);

  const ctrlKey = Boolean(event.ctrlKey);
  const shiftKey = Boolean(event.shiftKey);
  const altKey = Boolean(event.altKey);
  const metaKey = Boolean(event.metaKey);

  const modifiers: string[] = [];
  if (ctrlKey) modifiers.push("Ctrl");
  if (altKey) modifiers.push("Alt");
  if (shiftKey) modifiers.push("Shift");
  if (metaKey) modifiers.push("Meta");

  const category = classifyKey(key, code);
  const isPrintable = key.length === 1 && !ctrlKey && !altKey && !metaKey;
  const shortcut = buildShortcutString(modifiers, key);
  const description = `${key} (Code: ${code}, KeyCode: ${keyCode})`;

  return {
    key,
    code,
    keyCode,
    which,
    location,
    repeat,
    isComposing,
    ctrlKey,
    shiftKey,
    altKey,
    metaKey,
    modifiers,
    shortcut,
    category,
    isPrintable,
    description,
  };
}

/**
 * Alias for getKeyEventInfo to normalize keyboard events from any source.
 */
export function normalizeKeyboardEvent(event: PartialKeyboardEvent): NormalizedKeyEvent {
  return getKeyEventInfo(event);
}

/**
 * Resolves standard keyboard event code from a key name if available.
 */
export function getKeyboardCode(key: string): string {
  if (typeof key !== "string" || key.length === 0) {
    return "Unidentified";
  }

  if (/^[a-zA-Z]$/.test(key)) {
    return `Key${key.toUpperCase()}`;
  }

  if (/^[0-9]$/.test(key)) {
    return `Digit${key}`;
  }

  switch (key) {
    case " ":
    case "Space":
      return "Space";
    case "Enter":
      return "Enter";
    case "Escape":
      return "Escape";
    case "Tab":
      return "Tab";
    case "Backspace":
      return "Backspace";
    case "Delete":
      return "Delete";
    case "ArrowUp":
      return "ArrowUp";
    case "ArrowDown":
      return "ArrowDown";
    case "ArrowLeft":
      return "ArrowLeft";
    case "ArrowRight":
      return "ArrowRight";
    default:
      return "Unidentified";
  }
}
