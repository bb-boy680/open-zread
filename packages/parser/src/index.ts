import Parser from 'web-tree-sitter';
import { join } from 'path';
import type { FileManifest, SymbolManifest, SymbolInfo } from '@open-zread/types';
import { logger, getProjectRoot, readTextFile } from '@open-zread/utils';
import { isLanguageSupported } from './language-map';
import { loadParsers } from './wasm-loader';
import { parseVueSfc } from './vue-handler';

// SCM Queries - Use Tree-sitter S-expression syntax for precise extraction
const SCM_QUERIES: Record<string, string> = {
  typescript: `
    (import_statement) @import
    (export_statement) @export
    (function_declaration name: (identifier) @fn_name) @fn
    (arrow_function) @arrow_fn
    (class_declaration name: (type_identifier) @class_name) @class
    (interface_declaration name: (type_identifier) @iface_name) @iface
    (method_definition name: (property_identifier) @method_name) @method
  `,
  javascript: `
    (import_statement) @import
    (export_statement) @export
    (function_declaration name: (identifier) @fn_name) @fn
    (arrow_function) @arrow_fn
    (class_declaration name: (identifier) @class_name) @class
    (method_definition name: (property_identifier) @method_name) @method
  `,
  go: `
    (import_declaration) @import
    (function_declaration name: (identifier) @fn_name) @fn
    (type_declaration) @type
  `,
  python: `
    (import_statement) @import
    (function_definition name: (identifier) @fn_name) @fn
    (class_definition name: (identifier) @class_name) @class
  `,
};

// Extract symbols using SCM Query
function extractWithQuery(
  tree: Parser.Tree,
  language: string,
  parser: Parser
): { imports: string[]; exports: string[]; functions: Array<{ name: string; signature: string }> } {
  const queryStr = SCM_QUERIES[language];
  if (!queryStr) {
    // Fallback to basic traversal
    return extractBasic(tree);
  }

  try {
    const lang = parser.getLanguage();
    const query = lang.query(queryStr);
    const matches = query.matches(tree.rootNode);

    const imports: string[] = [];
    const exports: string[] = [];
    const functions: Array<{ name: string; signature: string }> = [];

    for (const match of matches) {
      for (const capture of match.captures) {
        const node = capture.node;
        const name = capture.name;

        if (name === 'import') {
          imports.push(node.text);
        } else if (name === 'export') {
          exports.push(node.text);
        } else if (name === 'fn' || name === 'arrow_fn' || name === 'method') {
          const fnNameNode = node.childForFieldName('name');
          const fnName = fnNameNode?.text || 'anonymous';
          functions.push({
            name: fnName,
            signature: node.text.slice(0, 150),
          });
        }
      }
    }

    return { imports, exports, functions };
  } catch {
    logger.warn(`SCM Query failed, fallback to basic traversal: ${language}`);
    return extractBasic(tree);
  }
}

// Basic traversal (fallback approach)
function extractBasic(tree: Parser.Tree): { imports: string[]; exports: string[]; functions: Array<{ name: string; signature: string }> } {
  const imports: string[] = [];
  const exports: string[] = [];
  const functions: Array<{ name: string; signature: string }> = [];

  for (const child of tree.rootNode.children) {
    if (child.type === 'import_statement' || child.type === 'import_declaration') {
      imports.push(child.text);
    }
    if (child.type.startsWith('export')) {
      exports.push(child.text);
    }
    if (child.type === 'function_declaration') {
      const nameNode = child.childForFieldName('name');
      if (nameNode) {
        functions.push({
          name: nameNode.text,
          signature: child.text.slice(0, 100),
        });
      }
    }
  }

  return { imports, exports, functions };
}

// Parse single file (using SCM Query)
async function parseFile(
  filePath: string,
  language: string,
  parsers: Map<string, Parser>
): Promise<SymbolInfo | null> {
  const projectRoot = getProjectRoot();
  const fullPath = join(projectRoot, filePath);
  const source = await readTextFile(fullPath);

  const parser = parsers.get(language);
  if (!parser) {
    return null;
  }

  // Vue special handling
  if (language === 'vue') {
    const vueParser = parser;
    const tsParser = parsers.get('typescript') || parsers.get('tsx');

    const vueResult = await parseVueSfc(source, vueParser, tsParser);
    return {
      file: filePath,
      exports: vueResult.exports,
      functions: [],
      imports: vueResult.imports,
      docstrings: [],
    };
  }

  // Use SCM Query for precise parsing
  const tree = parser.parse(source);
  const { imports, exports, functions } = extractWithQuery(tree, language, parser);

  tree.delete();

  return {
    file: filePath,
    exports,
    functions,
    imports,
    docstrings: [],
  };
}

// Main parse function
export async function parseFiles(manifest: FileManifest): Promise<SymbolManifest> {
  logger.progress('Loading parsers');

  // Count required languages
  const languages = [...new Set(manifest.files.map(f => f.language))];
  const supportedLanguages = languages.filter(isLanguageSupported);

  logger.info(`Parsers to load: ${supportedLanguages.join(', ')}`);

  // Load parsers
  const parsers = await loadParsers(supportedLanguages);
  const loadedParsers = [...parsers.keys()];

  logger.success(`Loaded ${loadedParsers.length} parsers`);

  // Parse files
  logger.progress('Extracting symbols');

  const symbols: SymbolInfo[] = [];
  for (const file of manifest.files) {
    if (!isLanguageSupported(file.language)) {
      continue;
    }

    try {
      const symbolInfo = await parseFile(file.path, file.language, parsers);
      if (symbolInfo) {
        symbols.push(symbolInfo);
      }
    } catch {
      logger.warn(`Parse failed: ${file.path}`);
    }
  }

  logger.success(`Extracted symbols from ${symbols.length} files`);

  return {
    symbols,
    loadedParsers,
  };
}

// Export sub-modules
export * from './wasm-loader';
export * from './language-map';
export * from './vue-handler';