/**
 * 英文翻译字典
 */

import type { TranslationKeys } from '../types';

export const enUS: TranslationKeys = {
  config: {
    title: 'Zread — Edit Configuration',
    selectLanguage: 'UI Language',
    docLanguage: 'Document Language',
    llmProvider: 'LLM Provider',
    maxConcurrency: 'Max Concurrency',
    maxRetries: 'Max Retries',
    default: '(default: {default})',
    footer: 'ESC to exit | ↑↓ to select | Enter to confirm | s to save',
    saved: 'Configuration saved',
    saveFailed: 'Save failed',
    hasUnsavedChanges: 'Unsaved changes',
    pressS: 'Press s to save',
    current: 'Current',
    range: 'Range',
    invalidRange: 'Input out of range',
  },
  language: {
    select: 'Select UI Language',
    zh: 'Chinese',
    en: 'English',
    current: 'Current',
    footer: 'ESC to go back | ↑↓ to select | Enter to confirm and go back | s to save and go back',
  },
  docLanguage: {
    select: 'Select Document Language',
    zh: 'Chinese',
    en: 'English',
    current: 'Current',
    footer: 'ESC to go back | ↑↓ to select | Enter to confirm and go back | s to save and go back',
  },
  provider: {
    select: 'Select LLM Provider',
  },
  concurrency: {
    set: 'Set Max Concurrency',
    range: 'Range: 1-10',
    invalid: 'Please enter an integer between 1-10',
    current: 'Current',
    footer: 'ESC to go back | Enter to confirm | s to save and go back',
  },
  retry: {
    set: 'Set Max Retries',
    range: 'Range: 0-5',
    invalid: 'Please enter an integer between 0-5',
    current: 'Current',
    footer: 'ESC to go back | Enter to confirm | s to save and go back',
  },
  common: {
    escBack: 'ESC to go back',
    saveAndBack: 's to save and go back',
  },
  divider: {
    prefix: '── ',
    middle: ' ─',
  },
};