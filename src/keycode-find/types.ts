export type KeyCategory =
  | "letter"
  | "number"
  | "function"
  | "modifier"
  | "navigation"
  | "numpad"
  | "whitespace"
  | "editing"
  | "special";

export interface NormalizedKeyEvent {
  key: string;
  code: string;
  keyCode: number;
  which: number;
  location: number;
  repeat: boolean;
  isComposing: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  modifiers: string[];
  shortcut: string;
  category: KeyCategory;
  isPrintable: boolean;
  description: string;
}

export interface PartialKeyboardEvent {
  key?: string;
  code?: string;
  keyCode?: number;
  which?: number;
  location?: number;
  repeat?: boolean;
  isComposing?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  getModifierState?: (keyArg: string) => boolean;
}
