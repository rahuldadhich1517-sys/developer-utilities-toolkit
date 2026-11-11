/**
 * Base error class for all developer-utilities-toolkit errors.
 */
export class ToolkitError extends Error {
  readonly code: string;

  constructor(message: string, code = "TOOLKIT_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when input validation fails.
 */
export class ValidationError extends ToolkitError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

/**
 * Thrown when parsing code or text syntax fails.
 */
export class ParsingError extends ToolkitError {
  readonly line?: number;
  readonly column?: number;
  readonly offset?: number;

  constructor(
    message: string,
    options?: { line?: number; column?: number; offset?: number; code?: string }
  ) {
    super(message, options?.code ?? "PARSING_ERROR");
    this.line = options?.line;
    this.column = options?.column;
    this.offset = options?.offset;
  }
}

/**
 * Thrown when an adapter or required configuration is missing or invalid.
 */
export class ConfigurationError extends ToolkitError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
  }
}

/**
 * Thrown when an unsupported language feature or syntax is encountered.
 */
export class UnsupportedError extends ToolkitError {
  readonly feature: string;

  constructor(feature: string, message?: string) {
    super(message ?? `Feature '${feature}' is not supported.`, "UNSUPPORTED_ERROR");
    this.feature = feature;
  }
}
