import { Box, Text } from 'ink';
import React from 'react';

interface ErrorViewProps {
  message: string;
}

export function ErrorView({ message }: ErrorViewProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="red">✗</Text>
        <Text color="red"> Error: {message}</Text>
      </Box>
    </Box>
  );
}
