import { Box, Text } from 'ink';
import React from 'react';

const BAR_WIDTH = 20;

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  if (total === 0) return null;

  const fraction = Math.min(current / total, 1);
  const filled = Math.round(fraction * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <Box marginBottom={1}>
      <Text color="gray">[{bar}]</Text>
      <Text color="gray"> {current}/{total}</Text>
    </Box>
  );
}
