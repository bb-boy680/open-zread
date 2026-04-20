/**
 * Wiki Command - Phase 2: Generate Markdown Content
 */

import { generateWikiContent } from '@open-zread/orchestrator';
import {
  loadWikiBlueprint,
  loadCachedSymbols,
  getProjectRoot,
} from '@open-zread/utils';
import { uiStore } from '../state';
import { runApp } from './app';

export interface WikiOptions {
  force?: boolean;
}

export async function runWiki(_opts: WikiOptions = {}) {
  uiStore.reset();
  uiStore.setTotalSteps(3);
  const { waitUntilExit } = runApp();

  try {
    // Step 1: Load blueprint
    uiStore.startStep('Loading wiki blueprint...');
    const blueprint = await loadWikiBlueprint();
    uiStore.completeStep();

    // Step 2: Verify symbol cache exists
    uiStore.startStep('Checking symbol cache...');
    const symbols = await loadCachedSymbols();
    if (!symbols || symbols.symbols.length === 0) {
      uiStore.failStep('符号缓存不存在或为空。请先运行 generate 命令。');
      await waitUntilExit();
      return;
    }
    uiStore.completeStep();

    // Step 3: Generate Wiki content
    uiStore.startStep('Generating wiki content...', `${blueprint.pages.length} pages`);
    const result = await generateWikiContent({
      onProgress: (state) => {
        if (state.currentPage) {
          uiStore.startStep(
            `Generating: ${state.currentPage.slug}`,
            `${state.completed}/${state.total}`
          );
        }
      },
    });
    uiStore.completeStep();

    // Report results
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