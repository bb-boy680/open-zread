import { defineConfig } from 'tsup'
import { cp } from 'fs/promises'
import { existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

function findFileRecursively(dir: string, target: string): string | null {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isFile() && entry === target) return fullPath
        if (stat.isDirectory()) {
          const found = findFileRecursively(fullPath, target)
          if (found) return found
        }
      } catch { /* skip */ continue }
    }
  } catch { /* skip */ }
  return null
}

export default defineConfig(() => {
  const isDev = process.env.NODE_ENV !== 'production'

  return {
    entry: ['src/index.tsx'],
    format: ['esm'],
    splitting: false,
    sourcemap: isDev,
    minify: !isDev,
    clean: true,
    bundle: true,
    external: [],
    noExternal: [/.*/],
    onSuccess: async () => {
      // 复制 yoga.wasm（Ink 布局引擎在运行时从相对路径 ./yoga.wasm 动态加载，无法被 bundle 打包）
      const cwd = process.cwd()
      const nmPath = resolve(cwd, '../node_modules')
      const found = findFileRecursively(nmPath, 'yoga.wasm')
      if (found && existsSync(found)) {
        await cp(found, join(cwd, 'dist/yoga.wasm'))
      }
    },
  }
})
