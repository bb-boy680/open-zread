/**
 * 英文翻译字典
 */

import type { TranslationKeys } from '../types';

export const enUS: TranslationKeys = {
  config: {
    title: 'Zread — Edit Configuration',
    selectLanguage: 'Select UI Language:',
    docLanguage: 'Document Language',
    llmProvider: 'LLM Provider',
    maxConcurrency: 'Max Concurrency',
    maxRetries: 'Max Retries',
    default: '(default: {default})',
    footer: 'ESC to exit | ↑↓ to select | Enter to confirm',
  },
  language: {
    select: 'Select UI Language',
  },
  docLanguage: {
    select: 'Select Document Language',
  },
  provider: {
    select: 'Select LLM Provider',
  },
  concurrency: {
    set: 'Set Max Concurrency',
  },
  retry: {
    set: 'Set Max Retries',
  },
  common: {
    escBack: 'ESC to go back',
  },
  divider: {
    prefix: '── ',
    middle: ' ─',
  },
};