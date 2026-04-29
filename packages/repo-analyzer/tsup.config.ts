import { defineConfig } from 'tsup'

export default defineConfig(() => {
  const isDev = process.env.NODE_ENV !== 'production'

  return {
    entry: ['src/index.ts', 'src/scanner/worker.ts'],
    format: ['esm'],
    splitting: false,
    sourcemap: isDev,
    minify: !isDev,
    clean: true,
  }
})
