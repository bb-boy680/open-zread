/**
 * Config Home Page - 主配置页面
 *
 * Layout: 选择列表，每项显示标题+值，左侧 │ 标记选中项
 */

import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useNavigate } from "react-router";
import SelectInput from "ink-select-input";
import Divider from "../../components/Divider";
import { useI18n } from "../../i18n";
import { useConfig } from "../../provider";

// SelectInput Item 类型
type SelectItem = { label: string; value: string };

interface ConfigItem {
  key: string;
  labelKey: string;
  getValue: (config: ReturnType<typeof useConfig>['config'], t: (key: string) => string) => string;
  default?: string;
  route: string;
}

// 配置项定义（动态获取值，使用翻译函数）
const configItems: ConfigItem[] = [
  {
    key: "language",
    labelKey: "config.selectLanguage",
    getValue: (config, t) => config.language === 'zh' ? t('language.zh') : t('language.en'),
    route: "/config/language",
  },
  {
    key: "doc_language",
    labelKey: "config.docLanguage",
    getValue: (config, t) => config.doc_language === 'zh' ? t('language.zh') : t('language.en'),
    route: "/config/doc_language",
  },
  {
    key: "llm.provider",
    labelKey: "config.llmProvider",
    getValue: (config, _t) => `${config.llm.provider} · ${config.llm.model}`,
    route: "/config/provider",
  },
  {
    key: "concurrency.max_concurrent",
    labelKey: "config.maxConcurrency",
    getValue: (config, _t) => String(config.concurrency.max_concurrent),
    default: "1",
    route: "/config/concurrency",
  },
  {
    key: "concurrency.max_retries",
    labelKey: "config.maxRetries",
    getValue: (config, _t) => String(config.concurrency.max_retries),
    default: "0",
    route: "/config/retry",
  },
];

// 自定义选项组件 - 两行布局（标题+值）
function ConfigItemComponent({
  isSelected,
  label,
  config,
}: {
  isSelected: boolean;
  label: string;
  config: ReturnType<typeof useConfig>['config'];
}) {
  const { t } = useI18n();
  const configItem = configItems.find((i) => t(i.labelKey) === label);

  if (!configItem) return null;

  const value = configItem.getValue(config, t);

  return (
    <Box flexDirection="column">
      {/* 标题行 */}
      <Box>
        <Text color={isSelected ? "cyan" : "gray"}>
          {isSelected ? "│ " : "  "}
        </Text>
        <Text bold={isSelected} color={isSelected ? "white" : "gray"}>
          {t(configItem.labelKey)}
          {configItem.default && (
            <Text dimColor> {t('config.default', { default: configItem.default })}</Text>
          )}
        </Text>
      </Box>

      {/* 值行 */}
      <Box>
        <Text color={isSelected ? "cyan" : "gray"}>
          {isSelected ? "│ " : "  "}
        </Text>
        <Text color={isSelected ? "cyan" : "white"}>{value}</Text>
      </Box>

      {/* 空行分隔 */}
      <Text> </Text>
    </Box>
  );
}

export default function ConfigHomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { config, save, hasChanges } = useConfig();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // ESC 退出程序由 Layout 统一处理
  // 这里只监听 s 键保存
  useInput((input) => {
    if (input === 's' && hasChanges && saveStatus === 'idle') {
      setSaveStatus('saving');
      save().then((success) => {
        setSaveStatus(success ? 'saved' : 'failed');
        setTimeout(() => setSaveStatus('idle'), 2000);
      });
    }
  });

  // 动态生成 selectItems
  const selectItems: SelectItem[] = configItems.map((item) => ({
    label: t(item.labelKey),
    value: item.key,
  }));

  const handleSelect = (item: SelectItem) => {
    const configItem = configItems.find((i) => i.key === item.value);
    if (configItem) {
      navigate(configItem.route);
    }
  };

  return (
    <Box flexDirection="column">
      {/* ========== Header ========== */}
      <Box>
        <Text bold>{t('config.title')}</Text>
        <Text dimColor> · ~/.zread/config.yaml</Text>
      </Box>

      {/* 上分割线 */}
      <Divider />

      {/* ========== 保存状态提示 ========== */}
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
      {hasChanges && saveStatus === 'idle' && (
        <Box marginTop={1}>
          <Text color="yellow">{t('config.hasUnsavedChanges')} · {t('config.pressS')}</Text>
        </Box>
      )}

      {/* ========== 配置项选择列表 ========== */}
      <Box marginTop={1}>
        <SelectInput
          items={selectItems}
          onSelect={handleSelect}
          indicatorComponent={() => <Text></Text>}
          itemComponent={({ isSelected, label }) => (
            <ConfigItemComponent
              isSelected={isSelected ?? false}
              label={label}
              config={config}
            />
          )}
        />
      </Box>

      {/* ========== Footer ========== */}
      <Box marginTop={1}>
        <Text dimColor>{t('config.footer')}</Text>
      </Box>
    </Box>
  );
}