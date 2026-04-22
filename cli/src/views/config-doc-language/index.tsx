/**
 * Config Doc Language Page - 文档生成语言选择
 */

import { Box, Text } from "ink";

export default function ConfigDocLanguagePage() {
  return (
    <Box flexDirection="column">
      <Text bold>选择文档生成语言</Text>
      <Text dimColor>ESC 返回</Text>
    </Box>
  );
}