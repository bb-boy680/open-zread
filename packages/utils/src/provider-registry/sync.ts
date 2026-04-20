import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ProviderRegistryData } from './types.js'
import { FALLBACK_PROVIDERS } from './fallback.js'

const CACHE_FILENAME = 'providers.json'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function getZreadDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return path.join(home, '.zread')
}

function getCachePath(): string {
  return path.join(getZreadDir(), CACHE_FILENAME)
}

async function isCacheValid(): Promise<boolean> {
  try {
    const stat = await fs.stat(getCachePath())
    return Date.now() - stat.mtimeMs < CACHE_TTL_MS
  } catch {
    return false
  }
}

async function saveCache(data: ProviderRegistryData): Promise<void> {
  const zreadDir = getZreadDir()
  await fs.mkdir(zreadDir, { recursive: true })
  await fs.writeFile(getCachePath(), JSON.stringify(data, null, 2), 'utf-8')
}

async function loadCache(): Promise<ProviderRegistryData> {
  const content = await fs.readFile(getCachePath(), 'utf-8')
  return JSON.parse(content) as ProviderRegistryData
}

/**
 * 同步 Provider 元数据
 * 优先使用本地缓存，缓存过期或不存在时使用 fallback
 */
export async function syncProviders(force = false): Promise<ProviderRegistryData> {
  if (!force && await isCacheValid()) {
    try {
      return await loadCache()
    } catch {
      // 缓存损坏，继续使用 fallback
    }
  }

  // 暂时直接使用 fallback（Models.dev API 待验证）
  // 后续可添加网络同步逻辑
  await saveCache(FALLBACK_PROVIDERS)
  return FALLBACK_PROVIDERS
}