// Worker Thread: Handles Hash calculation
// Main thread sends file paths via postMessage, Worker returns Hash results

import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { parentPort } from 'worker_threads';

interface HashTask {
  filePath: string;
}

interface HashResult {
  filePath: string;
  hash: string;
  error?: string;
}

async function calculateHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('md5').update(content).digest('hex').slice(0, 12);
}

// Listen for main thread messages
parentPort?.on('message', async (task: HashTask) => {
  try {
    const hash = await calculateHash(task.filePath);
    const result: HashResult = { filePath: task.filePath, hash };
    parentPort?.postMessage(result);
  } catch (error) {
    const result: HashResult = {
      filePath: task.filePath,
      hash: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    parentPort?.postMessage(result);
  }
});