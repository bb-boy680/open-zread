import { Box, Text } from 'ink';
import React from 'react';

export function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="blue">
          open-zread
        </Text>
        <Text color="gray"> — AI-powered code documentation</Text>
      </Box>
      <Box>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>
    </Box>
  );
}
