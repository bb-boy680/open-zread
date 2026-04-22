/**
 * Config Home Page - 主配置页面
 *
 * Layout: 选择列表，每项显示标题+值，左侧 │ 标记选中项
 */

import { Box, Text } from "ink";
import { useNavigate } from "react-router";
import SelectInput from "ink-select-input";
import Divider from "../../components/Divider";

// SelectInput Item 类型
type SelectItem = { label: string; value: string };

interface ConfigItem {
  key: string;
  label: string;
  value: string;
  default?: string;
  route: string; // 选中时跳转的路由
}

// 静态配置项（后续从 ~/.zread/config.yaml 加载）
const configItems: ConfigItem[] = [
  {
    key: "language",
    label: "请选择界面语言：",
    value: "zh",
    route: "/config/language",
  },
  {
    key: "doc_language",
    label: "文档生成语言",
    value: "zh",
    route: "/config/doc_language",
  },
  {
    key: "llm.provider",
    label: "LLM 提供商",
    value: "OpenAI · anthropic",
    route: "/config/provider",
  },
  {
    key: "concurrency",
    label: "最大并发数",
    value: "1",
    default: "1",
    route: "/config/concurrency",
  },
  {
    key: "retry",
    label: "最大重试次数",
    value: "1",
    default: "0",
    route: "/config/retry",
  },
];

// 转换为 SelectInput 格式
const selectItems: SelectItem[] = configItems.map((item) => ({
  label: item.label,
  value: item.key,
}));

// 自定义选项组件 - 两行布局（标题+值）
function ConfigItemComponent({
  isSelected,
  label,
}: {
  isSelected: boolean;
  label: string;
}) {
  const configItem = configItems.find((i) => i.label === label);

  if (!configItem) return null;

  return (
    <Box flexDirection="column">
      {/* 标题行 */}
      <Box>
        <Text color={isSelected ? "cyan" : "gray"}>
          {isSelected ? "│ " : "  "}
        </Text>
        <Text bold={isSelected} color={isSelected ? "white" : "gray"}>
          {configItem.label}
          {configItem.default && (
            <Text dimColor> (默认: {configItem.default})</Text>
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
  const navigate = useNavigate();

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
        <Text bold>Zread — 编辑配置</Text>
        <Text dimColor> · C:\Users\HONOR\.zread\config.yaml</Text>
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
        <Text dimColor>ESC 退出 | ↑↓ 选择 | Enter 确认</Text>
      </Box>
    </Box>
  );
}
