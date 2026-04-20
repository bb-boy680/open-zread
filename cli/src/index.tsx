#!/usr/bin/env bun
import { generateWikiCatalog, generateWikiContent } from '@open-zread/orchestrator';
import {
  loadConfig,
  getProjectRoot,
  loadCachedManifest,
  saveCachedManifest,
  loadCachedSymbols,
  saveCachedSymbols,
  needsReprocess,
  loadWikiBlueprint,
} from '@open-zread/utils';
import { scanFiles, parseFiles } from '@open-zread/repo-analyzer';
import { Box, Static, render } from 'ink';
import { Header } from './components/Header';
import { CurrentStep } from './components/CurrentStep';
import { ErrorView } from './components/ErrorView';
import { ProgressBar } from './components/ProgressBar';
import { StepHistoryItem } from './components/StepHistory';
import { SuccessView } from './components/SuccessView';
import { useProgress } from './hooks/use-progress';
import { uiStore } from './state';
import { ConfigEditorWrapper } from './config-editor/ConfigEditorWrapper';

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
    await loadConfig(); // 验证配置存在
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
    const result = await generateWikiCatalog();
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
  uiStore.setTotalSteps(4);
  const { waitUntilExit } = render(<App />);

  try {
    // Step 1: Load blueprint
    uiStore.startStep('Loading wiki blueprint...');
    const blueprint = await loadWikiBlueprint();
    uiStore.completeStep();

    // Step 2: Verify symbol cache exists
    uiStore.startStep('Checking symbol cache...');
    const symbols = await loadCachedSymbols();
    if (!symbols || symbols.symbols.length === 0) {
      uiStore.failStep('符号缓存不存在或为空。请先运行 Phase 1 生成蓝图和缓存。');
      await waitUntilExit();
      return;
    }
    uiStore.completeStep();

    // Step 3: Generate Wiki content
    uiStore.startStep(
      'Generating wiki content...',
      `${blueprint.pages.length} pages`
    );
    const result = await generateWikiContent({
      onProgress: (state) => {
        // Update progress display
        if (state.currentPage) {
          uiStore.startStep(
            `Generating: ${state.currentPage.slug}`,
            `${state.completed}/${state.total} completed`
          );
        }
      },
    });
    uiStore.completeStep();

    // Step 4: Report results
    if (result.failed > 0) {
      const failedSlugs = result.results
        .filter(r => !r.success)
        .map(r => r.slug)
        .join(', ');
      uiStore.failStep(`${result.failed} pages failed: ${failedSlugs}`);
    } else {
      const wikiDir = `${getProjectRoot()}/.open-zread/wiki/current`;
      uiStore.succeed(wikiDir);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    uiStore.failStep(message);
  }

  await waitUntilExit();
}

// ── Config command: interactive TUI editor ────────────────────────────────────

async function runConfigCommand() {
  const { waitUntilExit } = render(<ConfigEditorWrapper />);
  await waitUntilExit();
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'config') {
    await runConfigCommand();
  } else if (args[0] === 'wiki') {
    await runWikiCommand();
  } else {
    await runPhase1();
  }
}

main();