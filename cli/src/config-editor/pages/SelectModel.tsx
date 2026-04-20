import { Box, Text, useInput } from 'ink'
import React, { useEffect, useState } from 'react'
import { loadModels } from '../registry'
import type { ProviderInfo, ModelInfo } from '@open-zread/utils'

interface SelectModelProps {
  provider: ProviderInfo
  currentModel: string
  onSelect: (model: ModelInfo) => void
  onBack: () => void
}

export function SelectModel({ provider, currentModel, onSelect, onBack }: SelectModelProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModels(provider.id)
      .then(models => models.length > 0 ? models : [{ id: 'default', name: '默认模型' }])
      .then(setModels)
      .finally(() => setLoading(false))
  }, [provider.id])

  useInput((input, key) => {
    if (loading) return

    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1))
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(models.length - 1, selectedIndex + 1))
    } else if (key.return && models[selectedIndex]) {
      onSelect(models[selectedIndex])
    } else if (key.escape) {
      onBack()
    }
  })

  if (loading) {
    return <Text color="cyan">正在加载 {provider.name} 的模型列表...</Text>
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">选择模型</Text>
        <Text color="gray"> · {provider.name}</Text>
      </Box>

      {models.map((model, index) => (
        <Box key={model.id}>
          <Text color={index === selectedIndex ? 'cyan' : 'white'}>
            {index === selectedIndex ? '● ' : '○ '}
          </Text>
          <Text color={index === selectedIndex ? 'cyan' : 'gray'} bold={index === selectedIndex}>
            {model.name}
          </Text>
          {model.max_tokens && <Text color="gray" dimColor> ({model.max_tokens} tokens)</Text>}
          {model.id === currentModel && <Text color="green" dimColor> ← 当前</Text>}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="gray" dimColor>↑/↓: 导航 | enter: 选择 | esc: 返回</Text>
      </Box>
    </Box>
  )
}