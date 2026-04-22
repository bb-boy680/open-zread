/**
 * Config Doc Language Page - 文档生成语言选择
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

export default function ConfigDocLanguagePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { config, setField, save } = useConfig();
  const [selectedValue, setSelectedValue] = useState(config.doc_language);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // ESC 返回由 Layout 统一处理
  // 这里只监听 s 键保存
  useInput((input) => {
    if (input === 's' && saveStatus === 'idle') {
      setField('doc_language', selectedValue);
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
  });

  const handleSelect = (item: SelectItem) => {
    setSelectedValue(item.value);
    setField('doc_language', item.value);
    // Enter 确认后返回上一级
    navigate('/config');
  };

  // 根据当前语言显示对应的选项标签
  const displayOptions: SelectItem[] = languageOptions.map(opt => ({
    label: opt.value === 'zh' ? t('docLanguage.zh') : t('docLanguage.en'),
    value: opt.value,
  }));

  return (
    <Box flexDirection="column">
      {/* 当前值 */}
      <Box marginTop={1}>
        <Text dimColor>{t('docLanguage.current')}: </Text>
        <Text color="cyan">
          {config.doc_language === 'zh' ? t('docLanguage.zh') : t('docLanguage.en')}
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
        <Text dimColor>{t('docLanguage.footer')}</Text>
      </Box>
    </Box>
  );
}