import { Box, Text, useInput } from 'ink';
import React, { useRef } from 'react';
import TextInput from 'ink-text-input';
import type { FieldDef } from '../types';

interface EditPageContentProps {
  field: FieldDef;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EditPageContent({
  field,
  value,
  error,
  onChange,
  onConfirm,
  onCancel,
}: EditPageContentProps) {
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // Capture Escape to cancel
  useInput((input, key) => {
    if (input === '\x1b' || key.escape) {
      onCancelRef.current();
    }
  });

  function handleSubmit(submitted: string) {
    onChange(submitted);
    onConfirm();
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="white" bold>
          {field.label}
        </Text>
        {field.helpText && (
          <Text color="gray" dimColor>
            {' '}{field.helpText}
          </Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="cyan">{'> '}</Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={handleSubmit}
          placeholder={field.defaultValue}
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}
