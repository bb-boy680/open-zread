#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { loadConfig } from '@open-zread/config';
import { scanFiles } from '@open-zread/scanner';
import { parseFiles } from '@open-zread/parser';
import { dehydrate } from '@open-zread/dehydrator';
import { loadCachedManifest, loadCachedSkeleton, saveCachedManifest, saveCachedSkeleton, needsReprocess } from '@open-zread/cache';
import { runAgents } from '@open-zread/agents';
import { generateWikiJson } from '@open-zread/output';
import { logger, getProjectRoot } from '@open-zread/utils';
import { Progress, Success, ErrorDisplay, Result } from './ui';

async function main() {
  try {
    // Load config
    const config = await loadConfig();
    const projectRoot = getProjectRoot();

    // Scan files
    const manifest = await scanFiles(projectRoot);

    if (manifest.totalFiles === 0) {
      render(<ErrorDisplay message="No parseable source files found" />);
      return;
    }

    // Check cache
    const cachedManifest = await loadCachedManifest();
    const cachedSkeleton = await loadCachedSkeleton();

    let skeleton;

    if (!needsReprocess(cachedManifest, manifest) && cachedSkeleton) {
      render(<Success message="Using cache, skipping parse" />);
      skeleton = cachedSkeleton;
    } else {
      // Parse files
      const symbols = await parseFiles(manifest);

      // Dehydrate compress
      skeleton = await dehydrate(symbols);

      // Save cache
      await saveCachedManifest(manifest);
      await saveCachedSkeleton(skeleton);
    }

    // Run Agent
    const pages = await runAgents(manifest, skeleton, config);

    // Generate output
    const outputPath = await generateWikiJson(pages, config);

    render(<Result outputPath={outputPath} />);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    render(<ErrorDisplay message={message} />);
  }
}

main();