#!/usr/bin/env bun
import { runAgents } from '@open-zread/agents';
import { loadCachedManifest, loadCachedSkeleton, needsReprocess, saveCachedManifest, saveCachedSkeleton } from '@open-zread/cache';
import { loadConfig } from '@open-zread/config';
import { dehydrate } from '@open-zread/dehydrator';
import { generateWikiJson } from '@open-zread/output';
import { parseFiles } from '@open-zread/parser';
import { scanFiles } from '@open-zread/scanner';
import type { TechStackSummary, WikiOutput } from '@open-zread/types';
import { getProjectRoot, readJsonFile } from '@open-zread/utils';
import { runWriterManager } from '@open-zread/writer';
import { Box, render, Text } from 'ink';
import { join } from 'path';
import { useEffect, useState } from 'react';

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

async function runWikiCommand() {
  const { waitUntilExit } = render(<App initialState={{ step: 'Loading wiki blueprint...', status: 'running' }} />);

  try {
    progress.start('Loading config...');
    const config = await loadConfig();

    progress.start('Loading wiki.json blueprint...');
    const projectRoot = getProjectRoot();
    const wikiJsonPath = join(projectRoot, '.open-zread', 'drafts', 'wiki.json');
    const wikiOutput = await readJsonFile<WikiOutput>(wikiJsonPath);

    progress.start('Loading cached skeleton...');
    const skeleton = await loadCachedSkeleton();
    if (!skeleton) {
      progress.error('No cached skeleton found. Run Phase 1 first.');
      await waitUntilExit();
      return;
    }

    const techStackSummary: TechStackSummary = wikiOutput.techStackSummary || {
      techStack: { languages: [], frameworks: [], buildTools: [] },
      projectType: 'unknown',
      entryPoints: [],
    };

    progress.start('Loading cache manifest...');
    const lastManifest = await loadCachedManifest();

    const force = process.argv.includes('--force');

    progress.start('Generating wiki pages...', `${wikiOutput.pages.length} pages, concurrency: ${config.concurrency?.max_concurrent}`);

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
      progress.error(`${failedCount} page(s) failed`);
    } else {
      progress.success(`Wiki generated: ${successCount}/${wikiOutput.pages.length} pages`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    progress.error(message);
  }

  await waitUntilExit();
}

async function runPhase1() {
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

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'wiki') {
    await runWikiCommand();
  } else {
    await runPhase1();
  }
}

main();
