export const LANGUAGE_TO_PARSER: Record<string, string> = {
  typescript: 'typescript',
  tsx: 'tsx',
  javascript: 'javascript',
  jsx: 'javascript',
  vue: 'vue',
  go: 'go',
  python: 'python',
};

export function isLanguageSupported(language: string): boolean {
  return LANGUAGE_TO_PARSER[language] !== undefined;
}

export function getParserName(language: string): string | null {
  return LANGUAGE_TO_PARSER[language] || null;
}
