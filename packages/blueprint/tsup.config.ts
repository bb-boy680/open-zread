import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@open-zread/agent',
    '@open-zread/skeleton',
    '@open-zread/core',
    '@open-zread/types'
  ]
})