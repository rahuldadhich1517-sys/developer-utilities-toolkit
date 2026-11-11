export type StandardColorName =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "grey"
  | "default";

export type BrightColorName =
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

export type AnsiStyleName =
  | "reset"
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "blink"
  | "inverse"
  | "hidden"
  | "strikethrough";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type ColorInput =
  | StandardColorName
  | BrightColorName
  | number
  | RgbColor
  | string; // Hex e.g. "#ff0000" or rgb string

export interface AnsiFormatOptions {
  color?: ColorInput;
  background?: ColorInput;
  style?: AnsiStyleName | AnsiStyleName[];
}

export interface AnsiToHtmlOptions {
  classNamePrefix?: string;
  useClasses?: boolean;
}
