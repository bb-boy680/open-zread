/**
 * Config Retry Page - 最大重试次数设置
 */

import { Box, Text } from "ink";

export default function ConfigRetryPage() {
  return (
    <Box flexDirection="column">
      <Text bold>设置最大重试次数</Text>
      <Text dimColor>ESC 返回</Text>
    </Box>
  );
}