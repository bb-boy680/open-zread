import { Box, Text, useInput } from 'ink'
import React, { useEffect, useState } from 'react'
import { loadProviders, refreshProviders } from '../registry'
import type { ProviderInfo } from '@open-zread/utils'

interface SelectProviderProps {
  currentProvider: string
  onSelect: (provider: ProviderInfo) => void
  onBack: () => void
}

export function SelectProvider({ currentProvider, onSelect, onBack }: SelectProviderProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProviders()
      .then(setProviders)
      .catch(err => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  useInput((input, key) => {
    if (loading || error) return

    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1))
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(providers.length - 1, selectedIndex + 1))
    } else if (key.return && providers[selectedIndex]) {
      onSelect(providers[selectedIndex])
    } else if (key.escape) {
      onBack()
    } else if (input === 'r') {
      setLoading(true)
      setError(null)
      refreshProviders()
        .then(() => loadProviders())
        .then(setProviders)
        .catch(err => setError(err instanceof Error ? err.message : '刷新失败'))
        .finally(() => setLoading(false))
    }
  })

  if (loading) {
    return <Text color="cyan">正在加载 Provider 列表...</Text>
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">加载失败: {error}</Text>
        <Text color="gray">按 r 重试 | esc 返回</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">选择 LLM Provider</Text>
        <Text color="gray"> · 当前: {currentProvider}</Text>
      </Box>

      {providers.map((provider, index) => (
        <Box key={provider.id}>
          <Text color={index === selectedIndex ? 'cyan' : 'white'}>
            {index === selectedIndex ? '● ' : '○ '}
          </Text>
          <Text color={index === selectedIndex ? 'cyan' : 'gray'} bold={index === selectedIndex}>
            {provider.name}
          </Text>
          {provider.id === currentProvider && <Text color="green" dimColor> ← 当前</Text>}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="gray" dimColor>↑/↓: 导航 | enter: 选择 | r: 刷新 | esc: 返回</Text>
      </Box>
    </Box>
  )
}