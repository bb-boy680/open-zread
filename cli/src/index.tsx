#!/usr/bin/env bun
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { loadConfig } from '@open-zread/config';
import { scanFiles } from '@open-zread/scanner';
import { parseFiles } from '@open-zread/parser';
import { dehydrate } from '@open-zread/dehydrator';
import { loadCachedManifest, loadCachedSkeleton, saveCachedManifest, saveCachedSkeleton, needsReprocess } from '@open-zread/cache';
import { runAgents } from '@open-zread/agents';
import { generateWikiJson } from '@open-zread/output';
import { getProjectRoot } from '@open-zread/utils';

interface AppState {
  step: string;
  detail?: string;
  status: 'running' | 'success' | 'error';
  outputPath?: string;
  error?: string;
}

function App({ initialState }: { initialState: AppState }) {
  const [state, setState] = useState<AppState>(initialState);

  useEffect(() => {
    const unsubscribe = subscribeToState(setState);
    return unsubscribe;
  }, []);

  if (state.status === 'error') {
    return (
      <Box>
        <Text color="red">✗</Text>
        <Text> {state.error}</Text>
      </Box>
    );
  }

  if (state.status === 'success') {
    return (
      <Box flexDirection="column">
        <Text color="green">✅ Blueprint generated</Text>
        <Text color="gray">  {state.outputPath}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color="cyan">🔄</Text>
      <Text> {state.step}</Text>
      {state.detail && <Text color="gray"> {state.detail}</Text>}
    </Box>
  );
}

// State subscription for real-time updates
let stateListeners: Array<(state: AppState) => void> = [];

function subscribeToState(listener: (state: AppState) => void) {
  stateListeners.push(listener);
  return () => {
    stateListeners = stateListeners.filter(l => l !== listener);
  };
}

function updateState(state: AppState) {
  stateListeners.forEach(listener => listener(state));
}

// Real-time progress logger
const progress = {
  start(step: string, detail?: string) {
    updateState({ step, detail, status: 'running' });
  },
  success(outputPath: string) {
    updateState({ step: 'Complete', status: 'success', outputPath });
  },
  error(message: string) {
    updateState({ step: 'Error', status: 'error', error: message });
  }
};

async function main() {
  // Initial render with empty state
  const { waitUntilExit } = render(<App initialState={{ step: 'Initializing...', status: 'running' }} />);

  try {
    progress.start('Loading config...');
    const config = await loadConfig();
    const projectRoot = getProjectRoot();

    progress.start('Scanning files...');
    const manifest = await scanFiles(projectRoot);

    if (manifest.totalFiles === 0) {
      progress.error('No parseable source files found');
      await waitUntilExit();
      return;
    }

    progress.start('Checking cache...', `${manifest.totalFiles} files found`);

    const cachedManifest = await loadCachedManifest();
    const cachedSkeleton = await loadCachedSkeleton();

    let skeleton;

    if (!needsReprocess(cachedManifest, manifest) && cachedSkeleton) {
      progress.start('Using cached skeleton...');
      skeleton = cachedSkeleton;
    } else {
      progress.start('Parsing files...', `${manifest.totalFiles} files`);
      const symbols = await parseFiles(manifest);

      progress.start('Dehydrating code...');
      skeleton = await dehydrate(symbols);

      progress.start('Saving cache...');
      await saveCachedManifest(manifest);
      await saveCachedSkeleton(skeleton);
    }

    progress.start('Running agents...', 'ScanAgent → ClusterAgent → OutlineAgent');
    const pages = await runAgents(manifest, skeleton, config);

    progress.start('Generating wiki.json...', `${pages.length} pages`);
    const outputPath = await generateWikiJson(pages, config);

    progress.success(outputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    progress.error(message);
  }

  await waitUntilExit();
}

main();