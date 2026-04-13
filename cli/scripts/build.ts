import { cp } from "fs/promises";
import { existsSync, readdirSync, statSync } from "fs";
import { execSync } from "child_process";
import { join, sep } from "path";

const NODE_MODULES = "../node_modules";
const DIST = "dist";

// Build
console.log("Bundling...");
execSync("bun build src/index.tsx --target bun --outfile dist/index.js", {
  stdio: "inherit",
});

// Recursively find a file by name in a directory
function findFileRecursively(dir: string, target: string): string | null {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isFile() && entry === target) {
          // Check if the parent path contains the expected package path
          if (fullPath.includes(target.replace(/[\\/]/g, sep))) {
            return fullPath;
          }
        }
        if (stat.isDirectory()) {
          const found = findFileRecursively(fullPath, target);
          if (found) return found;
        }
      } catch {
        // Skip permission denied, symlinks, etc.
        continue;
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return null;
}

// Find and copy .wasm files
const wasmFiles = [
  { packagePath: "yoga-wasm-web/dist/yoga.wasm", name: "yoga.wasm" },
  { packagePath: "web-tree-sitter/tree-sitter.wasm", name: "tree-sitter.wasm" },
  { packagePath: "source-map/lib/mappings.wasm", name: "mappings.wasm" },
];

for (const { packagePath, name } of wasmFiles) {
  const fileName = packagePath.split(/[\\/]/).pop()!;
  const found = findFileRecursively(NODE_MODULES, fileName);
  if (found && existsSync(found)) {
    console.log(`Copying ${name}...`);
    await cp(found, `${DIST}/${name}`);
  }
}

console.log("Build complete!");
