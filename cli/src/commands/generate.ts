/**
 * Generate Command - Phase 1: Generate Wiki Blueprint
 */

import { generateWikiCatalog } from '@open-zread/orchestrator';
import {
  loadConfig,
  getProjectRoot,
  loadCachedManifest,
  saveCachedManifest,
  loadCachedSymbols,
  saveCachedSymbols,
  needsReprocess,
} from '@open-zread/utils';
import { scanFiles, parseFiles } from '@open-zread/repo-analyzer';
import { uiStore } from '../state';
import { runApp } from './app';

export interface GenerateOptions {
  force?: boolean;
}

export async function runGenerate(opts: GenerateOptions = {}) {
  uiStore.reset();
  uiStore.setTotalSteps(opts.force ? 4 : 5);
  const { waitUntilExit } = runApp();

  try {
    uiStore.startStep('Loading config...');
    await loadConfig();
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

    // --force 选项：跳过缓存检查
    if (opts.force) {
      uiStore.startStep('Parsing files (force)', `${manifest.totalFiles} files`);
      const symbols = await parseFiles(manifest);
      uiStore.completeStep();

      uiStore.startStep('Saving cache...');
      await saveCachedManifest(manifest);
      await saveCachedSymbols(symbols);
      uiStore.completeStep();
    } else {
      uiStore.startStep('Checking cache...', `${manifest.totalFiles} files`);
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
    }

    uiStore.startStep('Running Blueprint Agent...');
    const result = await generateWikiCatalog();
    uiStore.completeStep();

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