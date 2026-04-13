#!/usr/bin/env bun
import { runAgents, runWriterManager } from '@open-zread/ai';
import { loadCachedManifest, loadCachedSkeleton, needsReprocess, saveCachedManifest, saveCachedSkeleton, loadConfig, generateWikiJson, getProjectRoot, readJsonFile } from '@open-zread/core';
import { dehydrate, parseFiles, scanFiles } from '@open-zread/skeleton';
import type { TechStackSummary, WikiOutput } from '@open-zread/types';
import { Box, Static, render } from 'ink';
import { join } from 'path';
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

// ── Phase 1: scan → parse → dehydrate → agents → wiki.json ──────────────────

async function runPhase1() {
  uiStore.setTotalSteps(7);
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
    const cachedSkeleton = await loadCachedSkeleton();
    uiStore.completeStep();

    let skeleton;

    if (!needsReprocess(cachedManifest, manifest) && cachedSkeleton) {
      uiStore.startStep('Using cached skeleton...');
      skeleton = cachedSkeleton;
      uiStore.completeStep();
    } else {
      uiStore.startStep('Parsing files...', `${manifest.totalFiles} files`);
      const symbols = await parseFiles(manifest);
      uiStore.completeStep();

      uiStore.startStep('Dehydrating code...');
      skeleton = await dehydrate(symbols);
      uiStore.completeStep();

      uiStore.startStep('Saving cache...');
      await saveCachedManifest(manifest);
      await saveCachedSkeleton(skeleton);
      uiStore.completeStep();
    }

    uiStore.startStep('Running agents...', 'ScanAgent → ClusterAgent → OutlineAgent');
    const pages = await runAgents(manifest, skeleton, config);
    uiStore.completeStep();

    uiStore.startStep('Generating wiki.json...', `${pages.length} pages`);
    const outputPath = await generateWikiJson(pages, config);
    uiStore.completeStep();

    uiStore.succeed(outputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    uiStore.failStep(message);
  }

  await waitUntilExit();
}

// ── Wiki command: wiki.json → markdown files ────────────────────────────────

async function runWikiCommand() {
  uiStore.startStep('Loading wiki blueprint...');
  const { waitUntilExit } = render(<App />);

  try {
    uiStore.startStep('Loading config...');
    const config = await loadConfig();
    uiStore.completeStep();

    const projectRoot = getProjectRoot();
    const wikiJsonPath = join(projectRoot, '.open-zread', 'drafts', 'wiki.json');
    const wikiOutput = await readJsonFile<WikiOutput>(wikiJsonPath);

    uiStore.startStep('Loading cached skeleton...');
    const skeleton = await loadCachedSkeleton();
    if (!skeleton) {
      uiStore.failStep('No cached skeleton found. Run Phase 1 first.');
      await waitUntilExit();
      return;
    }
    uiStore.completeStep();

    const techStackSummary: TechStackSummary = wikiOutput.techStackSummary || {
      techStack: { languages: [], frameworks: [], buildTools: [] },
      projectType: 'unknown',
      entryPoints: [],
    };

    uiStore.startStep('Loading cache manifest...');
    const lastManifest = await loadCachedManifest();
    uiStore.completeStep();

    const force = process.argv.includes('--force');
    uiStore.setTotalSteps(wikiOutput.pages.length + 4);

    uiStore.startStep('Generating wiki pages...', `${wikiOutput.pages.length} pages, concurrency: ${config.concurrency?.max_concurrent}`);

    const results = await runWriterManager({
      pages: wikiOutput.pages,
      config,
      skeleton,
      techStackSummary,
      lastManifest,
      force,
    });

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    if (failedCount > 0) {
      uiStore.failStep(`${failedCount} page(s) failed`);
    } else {
      uiStore.succeed(`Wiki generated: ${successCount}/${wikiOutput.pages.length} pages`);
    }
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
