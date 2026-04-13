import { Box, Text } from 'ink';
import React from 'react';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface SuccessViewProps {
  outputPath: string;
  totalDuration: number;
}

export function SuccessView({ outputPath, totalDuration }: SuccessViewProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="green">✓</Text>
        <Text color="green"> Blueprint generated successfully</Text>
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        <Text color="gray">Output: {outputPath}</Text>
        <Text color="gray">Total: {formatDuration(totalDuration)}</Text>
        <Text color="gray">{'\n'}Run open-zread wiki to generate documentation</Text>
      </Box>
    </Box>
  );
}
