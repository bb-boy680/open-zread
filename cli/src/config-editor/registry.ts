import { getProviderRegistry } from '@open-zread/utils'
import type { ProviderInfo, ModelInfo } from '@open-zread/utils'

export async function loadProviders(): Promise<ProviderInfo[]> {
  const registry = await getProviderRegistry()
  return registry.getAllProviders()
}

export async function loadModels(providerId: string): Promise<ModelInfo[]> {
  const registry = await getProviderRegistry()
  return registry.getModels(providerId)
}

export async function getProviderBaseUrl(providerId: string): Promise<string | undefined> {
  const registry = await getProviderRegistry()
  const provider = registry.getProvider(providerId)
  return provider?.base_url
}

export async function refreshProviders(): Promise<void> {
  await getProviderRegistry(true)
}