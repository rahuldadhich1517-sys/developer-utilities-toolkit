import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

console.log("=== Verifying Tarball in Clean Consumer Environment ===");

// 1. Pack tarball
console.log("Running npm pack...");
const packOutput = execSync("npm pack", { encoding: "utf-8" });
const lines = packOutput.trim().split(/\r?\n/);
const tarballFilename = lines[lines.length - 1].trim();
const tarballPath = path.resolve(tarballFilename);

console.log(`Created tarball: ${tarballFilename}`);

// 2. Create isolated temp directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolkit-consumer-"));
console.log(`Consumer temporary directory: ${tempDir}`);

try {
  // 3. Initialize consumer package
  fs.writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({
      name: "consumer-app",
      version: "1.0.0",
      type: "module",
    })
  );

  // 4. Install tarball
  console.log("Installing tarball in consumer directory...");
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: "inherit" });

  // 5. Test consumer ESM
  console.log("Testing Consumer ESM imports...");
  const esmScript = `
    import { createSnippetPayload, colorizeAnsi, cssSelectorToXPath, extractEmails } from "@rahul_dadhich15/developer-utilities-toolkit";
    import { formatHexView } from "@rahul_dadhich15/developer-utilities-toolkit/hex-view";
    import { validateLua } from "@rahul_dadhich15/developer-utilities-toolkit/lua-validate";

    const s = createSnippetPayload({ content: "consumer test" });
    if (!s) throw new Error("ESM createSnippetPayload failed");
    if (!colorizeAnsi("hi", { color: "green" })) throw new Error("ESM colorizeAnsi failed");
    if (cssSelectorToXPath("div") !== "//div") throw new Error("ESM cssSelectorToXPath failed");
    if (extractEmails("a@b.com").length !== 1) throw new Error("ESM extractEmails failed");
    if (!formatHexView(new Uint8Array([65]))) throw new Error("ESM formatHexView failed");
    if (!validateLua("local a = 1").valid) throw new Error("ESM validateLua failed");

    console.log("✓ Consumer ESM verification succeeded.");
  `;
  fs.writeFileSync(path.join(tempDir, "test-esm.mjs"), esmScript);
  execSync("node test-esm.mjs", { cwd: tempDir, stdio: "inherit" });

  // 6. Test consumer CJS
  console.log("Testing Consumer CommonJS requires...");
  const cjsScript = `
    const { createSnippetPayload, colorizeAnsi } = require("@rahul_dadhich15/developer-utilities-toolkit");
    const { formatHexView } = require("@rahul_dadhich15/developer-utilities-toolkit/hex-view");
    const { validateLua } = require("@rahul_dadhich15/developer-utilities-toolkit/lua-validate");

    if (!createSnippetPayload({ content: "cjs consumer" })) throw new Error("CJS snippet failed");
    if (!colorizeAnsi("hi", { color: "red" })) throw new Error("CJS ansi failed");
    if (!formatHexView(new Uint8Array([66]))) throw new Error("CJS hex failed");
    if (!validateLua("local b = 2").valid) throw new Error("CJS lua failed");

    console.log("✓ Consumer CJS verification succeeded.");
  `;
  fs.writeFileSync(path.join(tempDir, "test-cjs.cjs"), cjsScript);
  execSync("node test-cjs.cjs", { cwd: tempDir, stdio: "inherit" });

  console.log("=== All Consumer Verifications Succeeded Cleanly ===");
} finally {
  // Clean up
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(tarballPath, { force: true });
  } catch {
    // Ignore cleanup errors
  }
}
