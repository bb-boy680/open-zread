/**
 * Config Provider Page - LLM 提供商选择
 */

import { Box, Text } from "ink";

export default function ConfigProviderPage() {
  return (
    <Box flexDirection="column">
      <Text bold>选择 LLM 提供商</Text>
      <Text dimColor>ESC 返回</Text>
    </Box>
  );
}