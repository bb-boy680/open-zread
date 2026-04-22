/**
 * Config Concurrency Page - 最大并发数设置
 */

import { Box, Text } from "ink";

export default function ConfigConcurrencyPage() {
  return (
    <Box flexDirection="column">
      <Text bold>设置最大并发数</Text>
      <Text dimColor>ESC 返回</Text>
    </Box>
  );
}