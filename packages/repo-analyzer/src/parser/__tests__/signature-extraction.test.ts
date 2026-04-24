import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import Parser from 'web-tree-sitter';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

let tsxParser: Parser;
let tsParser: Parser;

function getTreeSitterDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  let current = dirname(__filename);
  for (let i = 0; i < 10; i++) {
    const bunCandidate = join(current, 'node_modules', '.bun', 'web-tree-sitter@0.20.8', 'node_modules', 'web-tree-sitter');
    if (existsSync(join(bunCandidate, 'tree-sitter.wasm'))) return bunCandidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return '';
}

async function initParsers(): Promise<void> {
  const treeSitterDir = getTreeSitterDir();

  await Parser.init({
    locateFile: (fileName: string) => join(treeSitterDir, fileName)
  });

  const wasmDir = join(homedir(), '.zread', 'parsers');

  const tsxWasm = readFileSync(join(wasmDir, 'tree-sitter-tsx.wasm'));
  const tsWasm = readFileSync(join(wasmDir, 'tree-sitter-typescript.wasm'));

  const tsxLang = await Parser.Language.load(new Uint8Array(tsxWasm));
  const tsLang = await Parser.Language.load(new Uint8Array(tsWasm));

  tsxParser = new Parser();
  tsxParser.setLanguage(tsxLang);

  tsParser = new Parser();
  tsParser.setLanguage(tsLang);
}

/**
 * Simulates the fixed extractExportFromNode logic from parser/index.ts
 */
function extractExportFromNode(node: Parser.SyntaxNode): string {
  const firstLine = node.text.split('\n')[0].trim();

  // Re-exports: export { ... } from '...'
  if (firstLine.includes(' from ')) {
    return firstLine;
  }

  // Find declaration inside export_statement
  const decl = node.children.find(c =>
    c.type.includes('declaration') ||
    c.type === 'lexical_declaration'
  );

  if (!decl) {
    return firstLine;
  }

  const bodyNode = decl.childForFieldName('body');
  if (bodyNode) {
    // Use id comparison (the fix)
    const bodyId = bodyNode.id;
    const parts: string[] = ['export'];
    for (const child of decl.children) {
      if (child.id === bodyId) continue;
      parts.push(child.text);
    }
    return parts.join(' ').trim();
  }

  // For interface/type (no body), use first line
  const declLine = decl.text.split('\n')[0].trim();
  return declLine.length > 100 ? declLine.slice(0, 100) + '...' : declLine;
}

/**
 * Simulates the fixed extractFunctionSignature logic from parser/index.ts
 */
function extractFunctionSignature(node: Parser.SyntaxNode): string {
  const bodyNode = node.childForFieldName('body');

  if (bodyNode) {
    // Use id comparison (the fix)
    const bodyId = bodyNode.id;
    const parts: string[] = [];
    for (const child of node.children) {
      if (child.id === bodyId) continue;
      parts.push(child.text);
    }
    return parts.join(' ').trim();
  }

  const firstLine = node.text.split('\n')[0].trim();
  return firstLine;
}

function extractExports(source: string, parser: Parser): string[] {
  const tree = parser.parse(source);
  const exports: string[] = [];

  const lang = parser.getLanguage();
  const query = lang.query(`(export_statement) @export`);
  const matches = query.matches(tree.rootNode);

  for (const match of matches) {
    const exportNode = match.captures[0].node;
    exports.push(extractExportFromNode(exportNode));
  }

  tree.delete();
  return exports;
}

function extractFunctions(source: string, parser: Parser): Array<{ name: string; signature: string }> {
  const tree = parser.parse(source);
  const functions: Array<{ name: string; signature: string }> = [];

  const lang = parser.getLanguage();
  const query = lang.query(`
    (function_declaration name: (identifier) @fn_name) @fn
  `);
  const matches = query.matches(tree.rootNode);

  for (const match of matches) {
    for (const capture of match.captures) {
      if (capture.name === 'fn') {
        const fnNode = capture.node;
        const fnNameNode = fnNode.childForFieldName('name');
        const fnName = fnNameNode?.text || 'anonymous';

        functions.push({
          name: fnName,
          signature: extractFunctionSignature(fnNode),
        });
      }
    }
  }

  tree.delete();
  return functions;
}

describe('Parser Signature Extraction', () => {
  beforeAll(async () => {
    await initParsers();
  });

  afterAll(() => {
    tsxParser?.delete();
    tsParser?.delete();
  });

  describe('Core Fix: Body Exclusion via ID Comparison', () => {
    test('should NOT include function body in signature', () => {
      const code = `export function Bridge () {
  const [state, setState] = useState('initial');
  return <div>Hello</div>;
}`;
      const exports = extractExports(code, tsxParser);

      expect(exports.length).toBe(1);
      // Critical: body content should NOT be in signature
      expect(exports[0]).not.toContain('useState');
      expect(exports[0]).not.toContain('<div>');
      expect(exports[0]).not.toContain('return');
    });

    test('should produce short signature for large function', () => {
      const largeBody = Array(50).fill('  const x = Math.random();').join('\n');
      const code = `export function massiveFunction() {\n${largeBody}\n}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export function massiveFunction ()');
      expect(exports[0].length).toBeLessThan(50);
    });
  });

  describe('Export Function Signatures', () => {
    test('should extract simple function signature', () => {
      const code = `export function Bridge () { return true; }`;
      const exports = extractExports(code, tsxParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export function Bridge ()');
    });

    test('should extract function with parameters', () => {
      const code = `export function fetchData(url: string, options?: RequestOptions) {
  return fetch(url, options);
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      // Should include params but not body
      expect(exports[0]).toContain('fetchData');
      expect(exports[0]).toContain('url: string');
      expect(exports[0]).toContain('options');
      expect(exports[0]).not.toContain('return fetch');
    });

    test('should extract async function signature', () => {
      const code = `export async function loadConfig() {
  return parseYaml(await readFile('./config.yaml'));
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toContain('async function loadConfig');
      expect(exports[0]).not.toContain('readFile');
      expect(exports[0]).not.toContain('parseYaml');
    });

    test('should extract function with return type', () => {
      const code = `export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toContain('calculateTotal');
      expect(exports[0]).toContain('number');
      expect(exports[0]).not.toContain('reduce');
    });

    test('should extract generic function', () => {
      const code = `export function createArray<T>(items: T[]): Array<T> {
  return [...items];
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toContain('createArray');
      expect(exports[0]).toContain('<T>');
      expect(exports[0]).not.toContain('[...items]');
    });
  });

  describe('Export Class Signatures', () => {
    test('should extract class signature without body', () => {
      const code = `export class UserService {
  private apiClient: ApiClient;
  constructor(client: ApiClient) {
    this.apiClient = client;
  }
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export class UserService');
      expect(exports[0]).not.toContain('apiClient');
      expect(exports[0]).not.toContain('constructor');
    });

    test('should extract generic class', () => {
      const code = `export class Container<T> {
  private items: T[] = [];
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toContain('Container');
      expect(exports[0]).toContain('<T>');
      expect(exports[0]).not.toContain('items');
    });

    test('should extract class extending base', () => {
      const code = `export class CustomError extends Error {
  constructor(message: string) {
    super(message);
  }
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toContain('CustomError');
      expect(exports[0]).toContain('extends Error');
      expect(exports[0]).not.toContain('constructor');
    });
  });

  describe('Export Interface and Type', () => {
    test('should extract interface name only', () => {
      const code = `export interface UserConfig {
  name: string;
  email: string;
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export interface UserConfig');
    });

    test('should extract type alias (first line)', () => {
      const code = `export type Status = 'pending' | 'active' | 'completed';`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toContain('type Status');
    });

    test('should extract generic interface', () => {
      const code = `export interface ApiResponse<T> {
  data: T;
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toContain('ApiResponse');
      expect(exports[0]).toContain('<T>');
    });
  });

  describe('Re-exports', () => {
    test('should extract named re-export completely', () => {
      const code = `export { useState, useEffect } from 'react';`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe("export { useState, useEffect } from 'react';");
    });

    test('should extract namespace re-export', () => {
      const code = `export * from './utils';`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe("export * from './utils';");
    });

    test('should extract renamed re-export', () => {
      const code = `export { loadConfig as load } from './config';`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe("export { loadConfig as load } from './config';");
    });
  });

  describe('Function Declarations (non-export)', () => {
    test('should extract function signature without body', () => {
      const code = `function internalHelper() {
  console.log('internal');
  return true;
}`;
      const functions = extractFunctions(code, tsParser);

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('internalHelper');
      expect(functions[0].signature).not.toContain('console.log');
    });

    test('should extract function with complex signature', () => {
      const code = `function processItems<T extends BaseItem>(items: T[]): ProcessResult<T> {
  for (const item of items) {
    process(item);
  }
  return { processed: items.length };
}`;
      const functions = extractFunctions(code, tsParser);

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('processItems');
      expect(functions[0].signature).not.toContain('for (const');
      expect(functions[0].signature).not.toContain('process(item)');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty function body', () => {
      const code = `export function emptyFunction() {}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export function emptyFunction ()');
    });

    test('should handle nested structures in function body', () => {
      const code = `export function nested() {
  function inner() { return 'nested'; }
  const arrow = () => inner();
  return arrow();
}`;
      const exports = extractExports(code, tsParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).not.toContain('function inner');
      expect(exports[0]).not.toContain('arrow =');
    });

    test('should handle TSX component', () => {
      const code = `export function Component() {
  return <div className="test">Hello</div>;
}`;
      const exports = extractExports(code, tsxParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export function Component ()');
      expect(exports[0]).not.toContain('<div>');
    });
  });

  describe('Compression Metrics', () => {
    test('should achieve >95% compression for large function', () => {
      // Simulate a 500+ line React component
      const bodyLines: string[] = [];
      for (let i = 0; i < 100; i++) {
        bodyLines.push(`  const [state${i}, setState${i}] = useState(null);`);
      }
      for (let i = 0; i < 50; i++) {
        bodyLines.push(`  useEffect(() => { setState${i}(data); }, [data]);`);
      }
      bodyLines.push('  return (<div className="container">');
      for (let i = 0; i < 30; i++) {
        bodyLines.push(`    <Component${i} value={state${i}} />`);
      }
      bodyLines.push('  </div>);');

      const code = `export function LargeComponent(props: Props) {\n${bodyLines.join('\n')}\n}`;
      const exports = extractExports(code, tsxParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export function LargeComponent (props: Props)');

      const originalLength = code.length;
      const signatureLength = exports[0].length;
      const compressionRatio = (1 - signatureLength / originalLength) * 100;

      // Log for visibility
      console.log(`Compression test: ${originalLength} → ${signatureLength} bytes (${compressionRatio.toFixed(1)}% reduction)`);

      // Should achieve >95% compression
      expect(compressionRatio).toBeGreaterThan(95);
    });

    test('should verify Bridge component compression', () => {
      // Real-world Bridge component from midscene
      const bridgeCode = `export function Bridge () {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('closed');
  const [messageList, setMessageList] = useState<BridgeMessageItem[]>([]);
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const lastScrollTopRef = useRef<number>(0);
  const [alwaysAllow, setAlwaysAllow] = useState<boolean>(false);
  const [alwaysDecline, setAlwaysDecline] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return localStorage.getItem(BRIDGE_SERVER_URL_KEY) || '';
  });
  const [isServerConfigExpanded, setIsServerConfigExpanded] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const connectionStatusMessageId = useRef<string | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  const appendBridgeMessage = (content: string) => {
    if (connectionStatusMessageId.current) {
      setMessageList((prev) =>
        prev.map((msg) =>
          msg.id === connectionStatusMessageId.current
            ? { ...msg, content: msg.content + '\\n' + content }
            : msg,
        ),
      );
    } else {
      const newMessage: BridgeMessageItem = {
        id: 'message-' + Date.now(),
        type: 'status',
        content: content,
        timestamp: new Date(),
        time: dayjs().format('HH:mm:ss.SSS'),
      };
      connectionStatusMessageId.current = newMessage.id;
      setMessageList((prev) => [...prev, newMessage]);
    }
  };

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'bridge-ui' });
    portRef.current = port;
    port.onMessage.addListener((message) => {
      if (message.type === workerMessageTypes.BRIDGE_STATUS_CHANGED) {
        setBridgeStatus(message.status);
      }
    });
    return () => { port.disconnect(); };
  }, []);

  return (
    <div className="bridge-mode-container">
      <div className="playground-form-container">
        <List dataSource={messageList} renderItem={(item) => (
          <List.Item key={item.id}>
            <div>{item.content}</div>
          </List.Item>
        )} />
      </div>
    </div>
  );
}`;

      const exports = extractExports(bridgeCode, tsxParser);

      expect(exports.length).toBe(1);
      expect(exports[0]).toBe('export function Bridge ()');

      const originalLength = bridgeCode.length;
      const signatureLength = exports[0].length;

      console.log(`Bridge compression: ${originalLength} → ${signatureLength} bytes`);
      console.log(`Ratio: ${(originalLength / signatureLength).toFixed(1)}:1`);

      // Original ~7KB → signature ~25 bytes
      expect(signatureLength).toBeLessThan(30);
      expect(originalLength / signatureLength).toBeGreaterThan(50); // >50:1 compression (real 7KB would be >100:1)
    });
  });

  describe('Multiple Exports', () => {
    test('should handle multiple exports in single file', () => {
      const code = `
export function ComponentA() {
  return <div>A</div>;
}

export function ComponentB(props: Props) {
  return <span>{props.name}</span>;
}

export const helper = () => 'helper';

export class Service {
  constructor() { this.client = null; }
}

export interface Options {
  name: string;
  value: number;
}
`;

      const exports = extractExports(code, tsxParser);

      expect(exports.length).toBe(5);

      // Verify none contain body content
      for (const exp of exports) {
        expect(exp).not.toContain('return');
        expect(exp).not.toContain('constructor()');
        expect(exp).not.toContain('{ this');
        expect(exp.length).toBeLessThan(80);
      }
    });
  });
});