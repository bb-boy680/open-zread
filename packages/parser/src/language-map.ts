// Language to Tree-sitter language name mapping
export const LANGUAGE_TO_PARSER: Record<string, string> = {
  typescript: 'typescript',
  tsx: 'tsx',
  javascript: 'javascript',
  jsx: 'javascript',
  vue: 'vue',
  go: 'go',
  python: 'python',
};

// Check if language is supported
export function isLanguageSupported(language: string): boolean {
  return LANGUAGE_TO_PARSER[language] !== undefined;
}

// Get parser name
export function getParserName(language: string): string | null {
  return LANGUAGE_TO_PARSER[language] || null;
}