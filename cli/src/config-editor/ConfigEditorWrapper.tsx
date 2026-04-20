import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState, useRef } from 'react';
import { loadConfig, saveConfig, getConfigPath } from '@open-zread/utils';
import type { AppConfig } from '@open-zread/types';
import { ConfigEditor } from './ConfigEditor';

interface ConfigEditorWrapperProps {
  onExit?: () => void;
}

function getDefaultConfig(): AppConfig {
  return {
    language: 'zh',
    doc_language: 'zh',
    llm: {
      provider: 'custom',
      model: 'glm-5',
      api_key: '',
      base_url: '',
    },
    concurrency: {
      max_concurrent: 1,
      max_retries: 0,
    },
  };
}

export function ConfigEditorWrapper({ onExit }: ConfigEditorWrapperProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingDefault, setCreatingDefault] = useState(false);

  useEffect(() => {
    loadConfig()
      .then((loaded) => {
        setConfig(loaded);
        setLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setLoading(false);
      });
  }, []);

  async function handleCreateDefault() {
    setCreatingDefault(true);
    try {
      const defaultConfig = getDefaultConfig();
      await saveConfig(defaultConfig);
      setConfig(defaultConfig);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`创建默认配置失败: ${message}`);
    }
    setCreatingDefault(false);
  }

  if (loading) {
    return (
      <Box paddingX={1}>
        <Text color="gray">加载中...</Text>
      </Box>
    );
  }

  // Config file doesn't exist
  if (error && !config) {
    return <NoConfigView _error={error} onCreate={handleCreateDefault} creating={creatingDefault} />;
  }

  // Config loaded with a warning
  if (error) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <ConfigHeaderMini />
        <Box marginTop={1}>
          <Text color="yellow">⚠ {error}</Text>
        </Box>
        {config && <ConfigEditor initialConfig={config} onExit={onExit} />}
      </Box>
    );
  }

  // Normal case
  if (config) {
    return <ConfigEditor initialConfig={config} onExit={onExit} />;
  }

  return null;
}

function ConfigHeaderMini() {
  return (
    <>
      <Box>
        <Text bold color="cyan">Zread</Text>
        <Text color="gray"> - 编辑配置</Text>
        <Text color="gray"> · </Text>
        <Text color="gray" dimColor>{getConfigPath()}</Text>
      </Box>
      <Box>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>
    </>
  );
}

function NoConfigView({ _error, onCreate, creating }: {
  _error: string;
  onCreate: () => void;
  creating: boolean;
}) {
  const onCreateRef = useRef(onCreate);
  onCreateRef.current = onCreate;

  useInput((input) => {
    if (input === 'y' || input === 'Y') {
      onCreateRef.current();
    } else if (input === 'n' || input === 'N' || input === 'q') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <ConfigHeaderMini />
      <Box marginTop={1}>
        <Text color="red">配置文件不存在: {getConfigPath()}</Text>
      </Box>
      {creating ? (
        <Box marginTop={1}>
          <Text color="gray">正在创建默认配置...</Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">按 Y 创建默认配置，按 N 退出</Text>
          <Text color="gray" dimColor>
            Y: 创建默认配置并打开编辑器  |  N: 退出
          </Text>
        </Box>
      )}
    </Box>
  );
}
