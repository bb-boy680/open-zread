/**
 * Config Concurrency Page - 最大并发数设置
 */

import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useNavigate } from "react-router";
import Divider from "../../components/Divider";
import { useI18n } from "../../i18n";
import { useConfig } from "../../provider";

const MIN = 1;
const MAX = 10;

export default function ConfigConcurrencyPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { config, setField, save } = useConfig();
  const [inputValue, setInputValue] = useState(String(config.concurrency.max_concurrent));
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // 验证输入
  const validate = (value: string): boolean => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < MIN || num > MAX) {
      setError(t('concurrency.invalid'));
      return false;
    }
    setError(null);
    return true;
  };

  // 输入变化时验证
  const handleChange = (value: string) => {
    setInputValue(value);
    if (value === '') {
      setError(null);
      return;
    }
    validate(value);
  };

  // ESC 返回由 Layout 统一处理
  // 这里只监听 Enter/s 键
  useInput((input, key) => {
    // Enter 键确认修改并返回（不保存）
    if (key.return && saveStatus === 'idle') {
      if (validate(inputValue)) {
        const num = parseInt(inputValue, 10);
        setField('concurrency.max_concurrent', num);
        navigate('/config');
      }
    }
    // s 键保存并返回
    if (input === 's' && saveStatus === 'idle') {
      if (validate(inputValue)) {
        const num = parseInt(inputValue, 10);
        setField('concurrency.max_concurrent', num);
        setSaveStatus('saving');
        save().then((success) => {
          setSaveStatus(success ? 'saved' : 'failed');
          if (success) {
            setTimeout(() => navigate('/config'), 500);
          } else {
            setTimeout(() => setSaveStatus('idle'), 2000);
          }
        });
      }
    }
  });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text bold>{t('config.title')}</Text>
        <Text dimColor> · {t('concurrency.set')}</Text>
      </Box>
      <Divider />

      {/* 当前值输入 */}
      <Box marginTop={1}>
        <Text dimColor>{t('concurrency.current')}: </Text>
        <TextInput
          value={inputValue}
          onChange={handleChange}
          placeholder={String(config.concurrency.max_concurrent)}
        />
      </Box>

      {/* 范围提示 */}
      <Box marginTop={1}>
        <Text dimColor>{t('concurrency.range')}</Text>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* 保存状态 */}
      {saveStatus === 'saving' && (
        <Box marginTop={1}>
          <Text color="yellow">正在保存...</Text>
        </Box>
      )}
      {saveStatus === 'saved' && (
        <Box marginTop={1}>
          <Text color="green">{t('config.saved')}</Text>
        </Box>
      )}
      {saveStatus === 'failed' && (
        <Box marginTop={1}>
          <Text color="red">{t('config.saveFailed')}</Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>{t('concurrency.footer')}</Text>
      </Box>
    </Box>
  );
}