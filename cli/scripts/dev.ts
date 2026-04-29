#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../dist')

mkdirSync(distDir, { recursive: true })
writeFileSync(resolve(distDir, 'index.js'), "#!/usr/bin/env bun\nimport '../src/index.tsx';\n")

console.log('Generated dist/index.js')
