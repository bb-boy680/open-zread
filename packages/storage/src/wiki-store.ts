import type { WikiPage } from '@open-zread/types';
import { getProjectRoot, joinPath, ensureDir, writeTextFile } from '@open-zread/utils';
import { existsSync, readdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { createVersionSnapshot } from './versioning';

const WIKI_DIR = '.open-zread/wiki';
const CURRENT_DIR = joinPath(WIKI_DIR, 'current');

export class WikiStore {
  private currentDir: string;

  constructor() {
    this.currentDir = join(getProjectRoot(), CURRENT_DIR);
  }

  // Write a single page as Markdown
  async writePage(page: WikiPage, content: string): Promise<string> {
    const filePath = join(this.currentDir, page.file);
    await ensureDir(dirname(filePath)); // Ensure parent directory exists
    await writeTextFile(filePath, content);
    return filePath;
  }

  // Read a single page
  async readPage(page: WikiPage): Promise<string | null> {
    const { readTextFile } = await import('@open-zread/utils');
    const filePath = join(this.currentDir, page.file);
    try {
      return await readTextFile(filePath);
    } catch {
      return null;
    }
  }

  // Create a version snapshot (call after writing)
  async createSnapshot(): Promise<string> {
    return createVersionSnapshot();
  }
}
