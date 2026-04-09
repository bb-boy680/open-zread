import Parser from 'web-tree-sitter';
import { logger } from '@open-zread/utils';

// Vue SFC script block extraction
export function extractVueScript(source: string): { scriptContent: string; scriptLang: string } | null {
  // Match <script> or <script lang="ts">
  const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    return null;
  }

  const scriptTag = scriptMatch[0];
  const scriptContent = scriptMatch[1].trim();

  // Detect language
  const langMatch = scriptTag.match(/lang="(\w+)"/);
  const scriptLang = langMatch ? langMatch[1] : 'javascript';

  return { scriptContent, scriptLang };
}

// Parse Vue SFC
export async function parseVueSfc(
  source: string,
  vueParser: Parser,
  tsParser?: Parser
): Promise<{ imports: string[]; exports: string[] }> {
  const result: { imports: string[]; exports: string[] } = { imports: [], exports: [] };

  // Use Vue parser to parse overall structure
  const vueTree = vueParser.parse(source);
  const scriptNode = vueTree.rootNode.childForFieldName('script');

  if (!scriptNode) {
    vueTree.delete();
    return result;
  }

  // Extract script content
  const scriptInfo = extractVueScript(source);
  if (!scriptInfo) {
    vueTree.delete();
    return result;
  }

  // Use TS/JS parser for secondary parsing of script
  const parser = scriptInfo.scriptLang === 'ts' ? tsParser : vueParser;
  if (!parser) {
    logger.warn('Vue script parser not loaded');
    vueTree.delete();
    return result;
  }

  const scriptTree = parser.parse(scriptInfo.scriptContent);

  // Extract imports and exports
  for (const child of scriptTree.rootNode.children) {
    if (child.type === 'import_statement') {
      result.imports.push(child.text);
    }
    if (child.type === 'export_statement') {
      result.exports.push(child.text);
    }
  }

  vueTree.delete();
  scriptTree.delete();

  return result;
}