import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import type { StepRecord } from '../state';

// Braille spinner frames — classic cli-spinners "dots" set
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface CurrentStepProps {
  step: StepRecord;
}

export function CurrentStep({ step }: CurrentStepProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const elapsed = ((Date.now() - step.startedAt) / 1000).toFixed(1);

  return (
    <Box>
      <Text color="blue">{SPINNER_FRAMES[frame]}</Text>
      <Text> {step.step}</Text>
      {step.detail && <Text color="gray"> {step.detail}</Text>}
      <Text color="gray"> ({elapsed}s)</Text>
    </Box>
  );
}
