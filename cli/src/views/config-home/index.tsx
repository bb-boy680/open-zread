/**
 * Config Home Page - 主配置页面
 *
 * Layout: 选择列表，每项显示标题+值，左侧 │ 标记选中项
 */

import { Box, Text } from "ink";
import { useNavigate } from "react-router";
import SelectInput from "ink-select-input";
import Divider from "../../components/Divider";
import { useI18n } from "../../i18n";

// SelectInput Item 类型
type SelectItem = { label: string; value: string };

interface ConfigItem {
  key: string;
  labelKey: string; // 翻译键
  value: string;
  default?: string;
  route: string;
}

// 静态配置项（使用翻译键）
const configItems: ConfigItem[] = [
  {
    key: "language",
    labelKey: "config.selectLanguage",
    value: "zh",
    route: "/config/language",
  },
  {
    key: "doc_language",
    labelKey: "config.docLanguage",
    value: "zh",
    route: "/config/doc_language",
  },
  {
    key: "llm.provider",
    labelKey: "config.llmProvider",
    value: "OpenAI · anthropic",
    route: "/config/provider",
  },
  {
    key: "concurrency",
    labelKey: "config.maxConcurrency",
    value: "1",
    default: "1",
    route: "/config/concurrency",
  },
  {
    key: "retry",
    labelKey: "config.maxRetries",
    value: "1",
    default: "0",
    route: "/config/retry",
  },
];

// 自定义选项组件 - 两行布局（标题+值）
function ConfigItemComponent({
  isSelected,
  label,
}: {
  isSelected: boolean;
  label: string;
}) {
  const { t } = useI18n();
  const configItem = configItems.find((i) => t(i.labelKey) === label);

  if (!configItem) return null;

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
        <Text color={isSelected ? "cyan" : "white"}>{configItem.value}</Text>
      </Box>

      {/* 空行分隔 */}
      <Text> </Text>
    </Box>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();

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
