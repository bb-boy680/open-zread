import { appendFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const LOG_DIR = join(homedir(), '.zread', 'logs');
const LOG_FILE = join(LOG_DIR, `open-zread-${new Date().toISOString().slice(0, 10)}.log`);

// Ensure log directory exists
function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Write log file (ensure UTF-8 encoding)
function writeLog(level: string, message: string): void {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;
  // Use Buffer to ensure UTF-8 encoding
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

// Get log file path
export function getLogFile(): string {
  return LOG_FILE;
}