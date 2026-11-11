import { ValidationError } from "./errors.js";

export function assertString(val: unknown, name = "value"): asserts val is string {
  if (typeof val !== "string") {
    throw new ValidationError(`Expected ${name} to be a string, got ${typeof val}`);
  }
}

export function assertNonEmptyString(val: unknown, name = "value"): asserts val is string {
  assertString(val, name);
  if (val.trim().length === 0) {
    throw new ValidationError(`Expected ${name} to be a non-empty string`);
  }
}

export function assertNumber(val: unknown, name = "value"): asserts val is number {
  if (typeof val !== "number" || Number.isNaN(val)) {
    throw new ValidationError(`Expected ${name} to be a valid number`);
  }
}

export function assertUint8Array(val: unknown, name = "value"): asserts val is Uint8Array {
  if (!(val instanceof Uint8Array)) {
    throw new ValidationError(`Expected ${name} to be an instance of Uint8Array`);
  }
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
