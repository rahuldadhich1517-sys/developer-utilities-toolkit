import { describe, expect, it } from "vitest";
import {
  getKeyEventInfo,
  getKeyboardCode,
  getModifierState,
  normalizeKeyboardEvent,
} from "../../src/keycode-find/index.js";
import { ValidationError } from "../../src/shared/errors.js";

describe("keycode-find utility", () => {
  it("extracts structured information from common keyboard event", () => {
    const info = getKeyEventInfo({
      key: "k",
      code: "KeyK",
      keyCode: 75,
      ctrlKey: true,
      shiftKey: true,
    });

    expect(info.key).toBe("k");
    expect(info.code).toBe("KeyK");
    expect(info.keyCode).toBe(75);
    expect(info.ctrlKey).toBe(true);
    expect(info.shiftKey).toBe(true);
    expect(info.altKey).toBe(false);
    expect(info.modifiers).toEqual(["Ctrl", "Shift"]);
    expect(info.shortcut).toBe("Ctrl+Shift+K");
    expect(info.category).toBe("letter");
  });

  it("identifies function keys and navigation keys", () => {
    const f12 = getKeyEventInfo({ key: "F12", code: "F12", keyCode: 123 });
    expect(f12.category).toBe("function");

    const arrow = getKeyEventInfo({ key: "ArrowDown", code: "ArrowDown" });
    expect(arrow.category).toBe("navigation");

    const numpad = getKeyEventInfo({ key: "5", code: "Numpad5" });
    expect(numpad.category).toBe("numpad");
  });

  it("handles space, enter, and whitespace keys", () => {
    const space = getKeyEventInfo({ key: " ", code: "Space" });
    expect(space.category).toBe("whitespace");
    expect(space.shortcut).toBe("Space");

    const enter = getKeyEventInfo({ key: "Enter", code: "Enter" });
    expect(enter.category).toBe("whitespace");
  });

  it("detects modifier state using getModifierState helper", () => {
    const event = {
      ctrlKey: true,
      altKey: false,
      shiftKey: true,
      metaKey: false,
    };

    expect(getModifierState(event, "Control")).toBe(true);
    expect(getModifierState(event, "Shift")).toBe(true);
    expect(getModifierState(event, "Alt")).toBe(false);
    expect(getModifierState(event, "Meta")).toBe(false);
  });

  it("resolves keyboard codes from key names", () => {
    expect(getKeyboardCode("a")).toBe("KeyA");
    expect(getKeyboardCode("5")).toBe("Digit5");
    expect(getKeyboardCode("Enter")).toBe("Enter");
    expect(getKeyboardCode(" ")).toBe("Space");
    expect(getKeyboardCode("")).toBe("Unidentified");
  });

  it("validates event object", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getKeyEventInfo(null as any)).toThrow(ValidationError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => normalizeKeyboardEvent("not an object" as any)).toThrow(ValidationError);
  });
});
