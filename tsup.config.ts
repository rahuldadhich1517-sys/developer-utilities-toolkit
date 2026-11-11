import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "pastebin/index": "src/pastebin/index.ts",
    "ansi-color/index": "src/ansi-color/index.ts",
    "selector-to-xpath/index": "src/selector-to-xpath/index.ts",
    "email-extract/index": "src/email-extract/index.ts",
    "hex-view/index": "src/hex-view/index.ts",
    "html-live-edit/index": "src/html-live-edit/index.ts",
    "keycode-find/index": "src/keycode-find/index.ts",
    "lua-validate/index": "src/lua-validate/index.ts",
    "raw-file-view/index": "src/raw-file-view/index.ts",
    "stack-trace-parse/index": "src/stack-trace-parse/index.ts",
    "xpath-test/index": "src/xpath-test/index.ts",
    "browser/index": "src/browser/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  target: "es2022",
  outDir: "dist",
});
