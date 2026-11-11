/**
 * Result container indicating success or failure.
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Source code location with line and column.
 */
export interface SourceLocation {
  line: number;
  column: number;
  offset?: number;
}

/**
 * Text range with start and end locations.
 */
export interface TextRange {
  start: SourceLocation;
  end: SourceLocation;
}
