import React from 'react';
import { Box, Text } from 'ink';

interface ProgressProps {
  step: string;
  detail?: string;
}

export function Progress({ step, detail }: ProgressProps) {
  return (
    <Box>
      <Text color="cyan">🔄</Text>
      <Text> {step}</Text>
      {detail && <Text color="gray"> {detail}</Text>}
    </Box>
  );
}

interface SuccessProps {
  message: string;
}

export function Success({ message }: SuccessProps) {
  return (
    <Box>
      <Text color="green">✓</Text>
      <Text> {message}</Text>
    </Box>
  );
}

interface ErrorProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorProps) {
  return (
    <Box>
      <Text color="red">✗</Text>
      <Text> {message}</Text>
    </Box>
  );
}

interface ResultProps {
  outputPath: string;
}

export function Result({ outputPath }: ResultProps) {
  return (
    <Box flexDirection="column">
      <Text color="green">✅ Blueprint generated</Text>
      <Text color="gray">  {outputPath}</Text>
    </Box>
  );
}