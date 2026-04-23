/**
 * Config Language Page - 界面语言选择
 */

import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useNavigate } from "react-router";
import SelectInput from "ink-select-input";
import { useI18n } from "../../i18n";
import { useConfig } from "../../provider";

type SelectItem = { label: string; value: string };

const languageOptions: SelectItem[] = [
  { label: '中文', value: 'zh' },
  { label: '英文', value: 'en' },
];

export default function ConfigLanguagePage() {
  const { t, setLanguage } = useI18n();
  const navigate = useNavigate();
  const { config, setField, save } = useConfig();
  const [selectedValue, setSelectedValue] = useState(config.language);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // ESC 返回由 Layout 统一处理
  // 这里只监听 s 键保存
  useInput((input) => {
    if (input === 's' && saveStatus === 'idle') {
      // 先更新暂存
      setField('language', selectedValue);
      // 热更新界面语言
      setLanguage(selectedValue === 'zh' ? 'zh-CN' : 'en-US');
      setSaveStatus('saving');
      save().then((success) => {
        setSaveStatus(success ? 'saved' : 'failed');
        if (success) {
          setTimeout(() => navigate(-1), 500);
        } else {
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      });
    }
  });

  const handleSelect = (item: SelectItem) => {
    setSelectedValue(item.value);
    setField('language', item.value);
    // 热更新界面语言
    setLanguage(item.value === 'zh' ? 'zh-CN' : 'en-US');
    // Enter 确认后返回上一级（使用 -1 避免路由栈堆积）
    navigate(-1);
  };

  // 根据当前语言显示对应的选项标签
  const displayOptions: SelectItem[] = languageOptions.map(opt => ({
    label: opt.value === 'zh' ? t('language.zh') : t('language.en'),
    value: opt.value,
  }));

  return (
    <Box flexDirection="column">
      {/* 当前值 */}
      <Box marginTop={1}>
        <Text dimColor>{t('language.current')}: </Text>
        <Text color="cyan">
          {config.language === 'zh' ? t('language.zh') : t('language.en')}
        </Text>
      </Box>

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

      {/* 选择列表 */}
      <Box marginTop={1}>
        <SelectInput
          items={displayOptions}
          onSelect={handleSelect}
          initialIndex={displayOptions.findIndex(i => i.value === selectedValue)}
        />
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>{t('language.footer')}</Text>
      </Box>
    </Box>
  );
}