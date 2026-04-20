/**
 * Shared App UI for progress commands
 */

import { Box, Static, render } from 'ink';
import { Header } from '../components/Header';
import { CurrentStep } from '../components/CurrentStep';
import { ErrorView } from '../components/ErrorView';
import { ProgressBar } from '../components/ProgressBar';
import { StepHistoryItem } from '../components/StepHistory';
import { SuccessView } from '../components/SuccessView';
import { useProgress } from '../hooks/use-progress';
import { uiStore } from '../state';

export function App() {
  const state = useProgress();

  if (state.status === 'error') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Header />
        <Static items={state.stepHistory}>
          {(item) => <StepHistoryItem key={item._key} item={item} />}
        </Static>
        <ErrorView message={state.errorMessage ?? 'Unknown error'} />
      </Box>
    );
  }

  if (state.status === 'success') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Header />
        <Static items={state.stepHistory}>
          {(item) => <StepHistoryItem key={item._key} item={item} />}
        </Static>
        <SuccessView
          outputPath={state.outputPath ?? ''}
          totalDuration={uiStore.getTotalDuration()}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header />
      <ProgressBar
        current={state.currentStepIndex}
        total={state.totalSteps}
      />
      <Static items={state.stepHistory}>
        {(item) => <StepHistoryItem key={item._key} item={item} />}
      </Static>
      {state.currentStep && <CurrentStep step={state.currentStep} />}
    </Box>
  );
}

/**
 * Render and wait for App to exit
 */
export function runApp() {
  return render(<App />);
}