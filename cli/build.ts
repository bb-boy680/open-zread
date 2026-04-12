import { cp } from "fs/promises";
import { existsSync } from "fs";
import { execSync } from "child_process";

const NODE_MODULES = "../node_modules";
const DIST = "dist";

// Build
console.log("Bundling...");
execSync("bun build src/index.tsx --target bun --outfile dist/index.js", {
  stdio: "inherit",
});

// Find and copy .wasm files
const wasmFiles = [
  { pattern: "*/yoga-wasm-web/dist/yoga.wasm", name: "yoga.wasm" },
  { pattern: "*/web-tree-sitter/tree-sitter.wasm", name: "tree-sitter.wasm" },
  { pattern: "*/source-map/lib/mappings.wasm", name: "mappings.wasm" },
];

for (const { pattern, name } of wasmFiles) {
  const result = execSync(`find ${NODE_MODULES} -path "${pattern}"`, {
    encoding: "utf-8",
  }).trim();
  const path = result.split("\n")[0];
  if (path && existsSync(path)) {
    console.log(`Copying ${name}...`);
    await cp(path, `${DIST}/${name}`);
  }
}

console.log("Build complete!");
