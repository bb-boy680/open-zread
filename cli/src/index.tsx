#!/usr/bin/env bun
import { generateBlueprint } from '@open-zread/blueprint';
import {
  loadConfig,
  getProjectRoot,
  loadCachedManifest,
  saveCachedManifest,
  loadCachedSymbols,
  saveCachedSymbols,
  needsReprocess,
} from '@open-zread/core';
import { scanFiles, parseFiles } from '@open-zread/skeleton';
import { Box, Static, render } from 'ink';
import React from 'react';
import { Header } from './components/Header';
import { CurrentStep } from './components/CurrentStep';
import { ErrorView } from './components/ErrorView';
import { ProgressBar } from './components/ProgressBar';
import { StepHistoryItem } from './components/StepHistory';
import { SuccessView } from './components/SuccessView';
import { useProgress } from './hooks/use-progress';
import { uiStore } from './state';

// ── App shell ───────────────────────────────────────────────────────────────

function App() {
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

// ── Phase 1: scan → parse → buildRepoMap → agents → wiki.json ──────────────────

async function runPhase1() {
  uiStore.setTotalSteps(5);
  uiStore.startStep('Initializing...');
  const { waitUntilExit } = render(<App />);

  try {
    uiStore.startStep('Loading config...');
    const config = await loadConfig();
    uiStore.completeStep();

    const projectRoot = getProjectRoot();

    uiStore.startStep('Scanning files...');
    const manifest = await scanFiles(projectRoot);
    uiStore.completeStep();

    if (manifest.totalFiles === 0) {
      uiStore.failStep('No parseable source files found');
      await waitUntilExit();
      return;
    }

    uiStore.startStep('Checking cache...', `${manifest.totalFiles} files found`);
    const cachedManifest = await loadCachedManifest();
    const cachedSymbols = await loadCachedSymbols();
    uiStore.completeStep();

    let symbols;

    if (!needsReprocess(cachedManifest, manifest) && cachedSymbols) {
      uiStore.startStep('Using cached symbols...');
      symbols = cachedSymbols;
      uiStore.completeStep();
    } else {
      uiStore.startStep('Parsing files...', `${manifest.totalFiles} files`);
      symbols = await parseFiles(manifest);
      uiStore.completeStep();

      uiStore.startStep('Saving cache...');
      await saveCachedManifest(manifest);
      await saveCachedSymbols(symbols);
      uiStore.completeStep();
    }

    uiStore.startStep('Running Blueprint Agent...');
    const language = (config.language === 'zh' || config.language === 'en') ? config.language : 'zh';
    const result = await generateBlueprint({ projectRoot, language });
    uiStore.completeStep();

    // Blueprint Agent already saves wiki.json via generate_blueprint tool
    // If outputPath is empty, something went wrong
    if (!result.outputPath) {
      uiStore.failStep('Blueprint Agent did not generate wiki.json');
      await waitUntilExit();
      return;
    }

    uiStore.succeed(result.outputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    uiStore.failStep(message);
  }

  await waitUntilExit();
}

// ── Wiki command: wiki.json → markdown files (Phase 2) ────────────────────────

async function runWikiCommand() {
  uiStore.startStep('Loading wiki blueprint...');
  const { waitUntilExit } = render(<App />);

  try {
    uiStore.startStep('Phase 2 not implemented yet...');
    uiStore.failStep('Wiki content generation will be implemented in Phase 2');
    await waitUntilExit();
    return;

    // TODO: Phase 2 implementation
    // uiStore.startStep('Loading config...');
    // const config = await loadConfig();
    // uiStore.completeStep();
    // ...
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    uiStore.failStep(message);
  }

  await waitUntilExit();
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'wiki') {
    await runWikiCommand();
  } else {
    await runPhase1();
  }
}

main();