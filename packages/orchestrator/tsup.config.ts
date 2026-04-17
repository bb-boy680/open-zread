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
  ],
  // 配置 .mdx 文件作为文本导入
  loader: {
    '.mdx': 'text',
  },
  // 排除 .mdx 文件从类型检查（它们作为字符串导入）
  esbuildOptions(options) {
    options.resolveExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.mdx']
  },
})