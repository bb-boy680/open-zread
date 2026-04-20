import { Box, Text, useInput } from 'ink';
import React, { useRef } from 'react';
import type { FieldDef, FieldOption } from '../types';

interface SelectPageContentProps {
  field: FieldDef;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onConfirm: (value: string) => void;
  onBack: () => void;
}

export function SelectPageContent({
  field,
  selectedIndex,
  onSelect,
  onConfirm,
  onBack,
}: SelectPageContentProps) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Build options list (llm.provider uses dynamic selection, handled by SelectProvider)
  const options: FieldOption[] = field.options ?? [];

  // Keyboard navigation
  useInput((input, key) => {
    if (key.upArrow) {
      onSelect(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      onSelect(Math.min(options.length - 1, selectedIndex + 1));
    } else if (key.return) {
      if (selectedIndex >= 0 && selectedIndex < options.length) {
        onConfirm(options[selectedIndex].value);
      }
    } else if (input === '\x1b' || key.escape) {
      onBackRef.current();
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="white" bold>
          {field.label}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {options.map((option, index) => (
          <Box key={option.value}>
            <Box width={2}>
              <Text color={index === selectedIndex ? 'cyan' : 'gray'}>
                {index === selectedIndex ? '> ' : '  '}
              </Text>
            </Box>
            <Text
              color={index === selectedIndex ? 'cyan' : 'gray'}
              bold={index === selectedIndex}
            >
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}