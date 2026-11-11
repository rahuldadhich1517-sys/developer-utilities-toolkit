import { getKeyEventInfo } from "../keycode-find/index.js";
import type { NormalizedKeyEvent } from "../keycode-find/types.js";

/**
 * Checks whether a given KeyboardEvent matches a targeted shortcut string (e.g. "Ctrl+Shift+K" or "Meta+S").
 */
export function isShortcutPressed(
  event: KeyboardEvent,
  targetShortcut: string
): boolean {
  const info = getKeyEventInfo(event);
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .split("+")
      .map((p) => p.trim())
      .sort()
      .join("+");

  return normalize(info.shortcut) === normalize(targetShortcut);
}

/**
 * Attaches a temporary one-shot or listener for keyboard event info.
 */
export function inspectKeyboardEvent(event: KeyboardEvent): NormalizedKeyEvent {
  return getKeyEventInfo(event);
}
