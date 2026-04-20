import type { ProviderRegistry, ProviderInfo, ModelInfo, ProviderRegistryData } from './types.js'
import { syncProviders } from './sync.js'

class ProviderRegistryImpl implements ProviderRegistry {
  private data: ProviderRegistryData

  constructor(data: ProviderRegistryData) {
    this.data = data
  }

  getProvider(id: string): ProviderInfo | undefined {
    return this.data.providers[id]
  }

  getAllProviders(): ProviderInfo[] {
    return Object.values(this.data.providers)
  }

  getModels(providerId: string): ModelInfo[] {
    const provider = this.getProvider(providerId)
    return provider ? Object.values(provider.models) : []
  }

  searchProviders(query: string): ProviderInfo[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllProviders().filter(p =>
      p.id.toLowerCase().includes(lowerQuery) ||
      p.name.toLowerCase().includes(lowerQuery)
    )
  }
}

let registryInstance: ProviderRegistryImpl | null = null

export async function getProviderRegistry(forceRefresh = false): Promise<ProviderRegistry> {
  if (registryInstance && !forceRefresh) {
    return registryInstance
  }
  const data = await syncProviders(forceRefresh)
  registryInstance = new ProviderRegistryImpl(data)
  return registryInstance
}

export { syncProviders }
export type { ProviderRegistry, ProviderInfo, ModelInfo, ProviderRegistryData } from './types.js'