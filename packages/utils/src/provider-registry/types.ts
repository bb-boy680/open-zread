/**
 * Provider Registry Types
 */

export interface ProviderRegistryData {
  version: string
  synced_at: string
  providers: Record<string, ProviderInfo>
}

export interface ProviderInfo {
  id: string
  name: string
  npm: string
  base_url?: string
  models: Record<string, ModelInfo>
}

export interface ModelInfo {
  id: string
  name: string
  max_tokens?: number
  supports_tools?: boolean
  supports_vision?: boolean
  supports_thinking?: boolean
}

export interface ProviderRegistry {
  getProvider(id: string): ProviderInfo | undefined
  getAllProviders(): ProviderInfo[]
  getModels(providerId: string): ModelInfo[]
  searchProviders(query: string): ProviderInfo[]
}