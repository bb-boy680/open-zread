import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const LOG_DIR = join(homedir(), '.zread', 'logs');
const LOG_FILE = join(LOG_DIR, `open-zread-${new Date().toISOString().slice(0, 10)}.log`);

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function writeLog(level: string, message: string): void {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;
  const buffer = Buffer.from(logLine, 'utf-8');
  appendFileSync(LOG_FILE, buffer);
}

export const logger = {
  info(message: string): void {
    writeLog('INFO', message);
  },

  warn(message: string): void {
    writeLog('WARN', message);
  },

  error(message: string): void {
    writeLog('ERROR', message);
  },

  success(message: string): void {
    writeLog('OK', message);
  },

  progress(step: string, detail?: string): void {
    const fullMessage = detail ? `${step} ${detail}` : step;
    writeLog('PROGRESS', fullMessage);
  },
};

export function getLogFile(): string {
  return LOG_FILE;
}
