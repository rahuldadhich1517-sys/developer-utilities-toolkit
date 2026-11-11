import { describe, expect, it } from "vitest";
import {
  formatStackTrace,
  parseStackFrame,
  parseStackTrace,
} from "../../src/stack-trace-parse/index.js";
import { ValidationError } from "../../src/shared/errors.js";

describe("stack-trace-parse utility", () => {
  it("parses V8 / Chrome / Node style stack frames", () => {
    const line1 = "    at myFunction (C:\\Projects\\app\\index.ts:25:10)";
    const f1 = parseStackFrame(line1);
    expect(f1).not.toBeNull();
    expect(f1!.functionName).toBe("myFunction");
    expect(f1!.fileName).toBe("C:\\Projects\\app\\index.ts");
    expect(f1!.lineNumber).toBe(25);
    expect(f1!.columnNumber).toBe(10);
    expect(f1!.isAsync).toBe(false);

    const line2 = "    at async processQueue (/home/user/app/server.js:42:5)";
    const f2 = parseStackFrame(line2);
    expect(f2!.functionName).toBe("processQueue");
    expect(f2!.isAsync).toBe(true);
    expect(f2!.lineNumber).toBe(42);

    const line3 = "    at Array.forEach (<anonymous>)";
    const f3 = parseStackFrame(line3);
    expect(f3!.functionName).toBe("Array.forEach");
    expect(f3!.source).toBe("<anonymous>");

    const line4 = "    at https://example.com/assets/bundle.js:100:20";
    const f4 = parseStackFrame(line4);
    expect(f4!.functionName).toBeUndefined();
    expect(f4!.fileName).toBe("https://example.com/assets/bundle.js");
    expect(f4!.lineNumber).toBe(100);
    expect(f4!.columnNumber).toBe(20);
  });

  it("parses Firefox and Safari style stack frames", () => {
    const ffLine = "render@http://localhost:3000/main.js:50:12";
    const f1 = parseStackFrame(ffLine);
    expect(f1!.functionName).toBe("render");
    expect(f1!.fileName).toBe("http://localhost:3000/main.js");
    expect(f1!.lineNumber).toBe(50);
    expect(f1!.columnNumber).toBe(12);

    const asyncFf = "async*fetchData@/api/client.js:15:3";
    const f2 = parseStackFrame(asyncFf);
    expect(f2!.functionName).toBe("fetchData");
    expect(f2!.isAsync).toBe(true);

    const nativeLine = "forEach@[native code]";
    const f3 = parseStackFrame(nativeLine);
    expect(f3!.functionName).toBe("forEach");
    expect(f3!.isNative).toBe(true);
  });

  it("parses full stack trace strings and Error objects", () => {
    const stackText = `Error: Something went wrong
    at handleRequest (/app/handler.js:10:5)
    at async dispatch (/app/router.js:20:15)
Non-stack log message`;

    const parsed = parseStackTrace(stackText);
    expect(parsed.message).toBe("Error: Something went wrong");
    expect(parsed.frames).toHaveLength(2);
    expect(parsed.frames[0]!.functionName).toBe("handleRequest");
    expect(parsed.frames[1]!.functionName).toBe("dispatch");
    expect(parsed.unparsedLines).toContain("Non-stack log message");

    const err = new Error("Test native error");
    const parsedErr = parseStackTrace(err);
    expect(parsedErr.frames.length).toBeGreaterThan(0);
  });

  it("formats structured stack frames into V8, Firefox, and clean styles", () => {
    const frames = [
      {
        functionName: "init",
        fileName: "/src/main.ts",
        source: "/src/main.ts:1:1",
        lineNumber: 1,
        columnNumber: 1,
        isNative: false,
        isAsync: false,
        isEval: false,
        raw: "",
      },
    ];

    const v8 = formatStackTrace(frames, { style: "v8" });
    expect(v8).toContain("at init (/src/main.ts:1:1)");

    const ff = formatStackTrace(frames, { style: "firefox" });
    expect(ff).toBe("init@/src/main.ts:1:1");

    const clean = formatStackTrace(frames, { style: "clean" });
    expect(clean).toBe("init (/src/main.ts:1:1)");
  });

  it("throws ValidationError on non-string/non-Error input", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => parseStackTrace(123 as any)).toThrow(ValidationError);
  });
});
