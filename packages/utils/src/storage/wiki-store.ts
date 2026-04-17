import type { WikiPage } from '@open-zread/types';
import { getProjectRoot, joinPath, ensureDir, writeTextFile, readTextFile } from '../file-io.js';
import { dirname, join } from 'path';
import { createVersionSnapshot } from './versioning';

const WIKI_DIR = '.open-zread/wiki';
const CURRENT_DIR = joinPath(WIKI_DIR, 'current');

export class WikiStore {
  private currentDir: string;

  constructor() {
    this.currentDir = join(getProjectRoot(), CURRENT_DIR);
  }

  async writePage(page: WikiPage, content: string): Promise<string> {
    const filePath = join(this.currentDir, page.file);
    await ensureDir(dirname(filePath));
    await writeTextFile(filePath, content);
    return filePath;
  }

  async readPage(page: WikiPage): Promise<string | null> {
    const filePath = join(this.currentDir, page.file);
    try {
      return await readTextFile(filePath);
    } catch {
      return null;
    }
  }

  async createSnapshot(): Promise<string> {
    return createVersionSnapshot();
  }
}
