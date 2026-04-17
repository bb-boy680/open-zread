import { Box, Text } from 'ink';
import React from 'react';
import type { StepRecord } from '../state';
import { formatDuration } from '../utils/format.js';

function getStatusIcon(status: StepRecord['status']): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    case 'running':
      return '…';
  }
}

function getStatusColor(status: StepRecord['status']): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'running':
      return 'gray';
  }
}

interface StepHistoryItemProps {
  item: StepRecord;
}

export function StepHistoryItem({ item }: StepHistoryItemProps) {
  return (
    <Box>
      <Text color={getStatusColor(item.status)}>{getStatusIcon(item.status)}</Text>
      <Text> {item.step}</Text>
      {item.detail && <Text color="gray"> {item.detail}</Text>}
      {item.duration !== undefined && (
        <Text color="gray"> {formatDuration(item.duration)}</Text>
      )}
    </Box>
  );
}
