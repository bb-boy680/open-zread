import { describe, test, expect } from 'bun:test';
import { buildRepoMap } from '../index.js';
import { estimateTokens, getDepth } from '../token-counter.js';
import { calculatePriority, selectByTokenBudget, getTopCoreFiles } from '../prioritizer.js';
import { buildDirectoryTree, trimSignature } from '../formatter.js';
import type { SymbolManifest, SymbolInfo, FilePriority } from '@open-zread/types';

describe('Repo Map Builder', () => {
  // Mock SymbolManifest
  const mockSymbols: SymbolManifest = {
    symbols: [
      {
        file: 'src/index.ts',
        exports: ['export function main()'],
        functions: [{ name: 'main', signature: 'function main(): void' }],
        imports: ['import { utils } from "./utils"'],
        docstrings: ['/** Entry point */'],
      },
      {
        file: 'src/utils.ts',
        exports: ['export const utils'],
        functions: [{ name: 'helper', signature: 'function helper(): string' }],
        imports: [],
        docstrings: [],
      },
      {
        file: 'src/auth/index.ts',
        exports: ['export { useAuth }'],
        functions: [],
        imports: ['import { useAuth } from "./useAuth"'],
        docstrings: [],
      },
      {
        file: 'src/auth/useAuth.ts',
        exports: ['export function useAuth()'],
        functions: [{ name: 'useAuth', signature: 'function useAuth(): AuthState' }],
        imports: [],
        docstrings: ['/** Handle JWT token */'],
      },
    ],
    loadedParsers: ['typescript'],
  };

  describe('buildRepoMap', () => {
    test('should generate Repo Map with default options', async () => {
      const result = await buildRepoMap(mockSymbols);

      expect(result.content).toContain('Project Tree & Symbols');
      expect(result.content).toContain('src/');
      expect(result.fileCount).toBeGreaterThan(0);
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.topFiles.length).toBeLessThanOrEqual(10);
    });

    test('should include all files when includeAll is true', async () => {
      const result = await buildRepoMap(mockSymbols, { includeAll: true });

      expect(result.fileCount).toBe(mockSymbols.symbols.length);
    });

    test('should respect token budget', async () => {
      const result = await buildRepoMap(mockSymbols, { tokenBudget: 100 });

      expect(result.tokenCount).toBeLessThanOrEqual(100 + 50); // +50 for header tolerance
    });
  });

  describe('token-counter', () => {
    test('estimateTokens should calculate tokens correctly', () => {
      const symbol: SymbolInfo = {
        file: 'src/test.ts',
        exports: ['export function a()', 'export function b()'],
        functions: [{ name: 'a', signature: 'function a()' }],
        imports: [],
        docstrings: ['/** test */'],
      };

      const tokens = estimateTokens(symbol);
      expect(tokens).toBeGreaterThan(0);
      // Expected: 1 (path) + 1 (doc) + 2 (exports) + 1 (fn) + 1 (depth) = 6 lines * 10 = 60
      expect(tokens).toBe(60);
    });

    test('getDepth should return correct depth', () => {
      expect(getDepth('src/index.ts')).toBe(1);
      expect(getDepth('src/auth/useAuth.ts')).toBe(2);
      expect(getDepth('index.ts')).toBe(0);
    });
  });

  describe('prioritizer', () => {
    test('calculatePriority should score files correctly', () => {
      const symbol: SymbolInfo = {
        file: 'src/utils.ts',
        exports: ['export const a', 'export const b'],
        functions: [],
        imports: [],
        docstrings: [],
      };

      const priority = calculatePriority(symbol, 5);

      expect(priority.file).toBe('src/utils.ts');
      expect(priority.referenceCount).toBe(5);
      expect(priority.exportCount).toBe(2);
      expect(priority.depth).toBe(1);
      expect(priority.score).toBe(5 * 10 + 2 * 5 + (10 - 1)); // ref + export + depth
    });

    test('selectByTokenBudget should respect budget', () => {
      const priorities: FilePriority[] = [
        { file: 'a.ts', score: 100, referenceCount: 10, exportCount: 5, depth: 0 },
        { file: 'b.ts', score: 50, referenceCount: 3, exportCount: 2, depth: 1 },
      ];

      const symbols: SymbolInfo[] = [
        { file: 'a.ts', exports: [], functions: [], imports: [], docstrings: [] },
        { file: 'b.ts', exports: [], functions: [], imports: [], docstrings: [] },
      ];

      const selected = selectByTokenBudget(priorities, symbols, 50);

      expect(selected.length).toBeLessThanOrEqual(2);
    });

    test('getTopCoreFiles should return core files', () => {
      const priorities: FilePriority[] = [
        { file: 'a.ts', score: 100, referenceCount: 10, exportCount: 5, depth: 0 },
        { file: 'b.ts', score: 50, referenceCount: 3, exportCount: 2, depth: 1 },
        { file: 'c.ts', score: 20, referenceCount: 1, exportCount: 1, depth: 2 },
      ];

      const topFiles = getTopCoreFiles(priorities, 3, 2);

      expect(topFiles).toContain('a.ts');
      expect(topFiles).toContain('b.ts');
      expect(topFiles).not.toContain('c.ts');
    });
  });

  describe('formatter', () => {
    test('buildDirectoryTree should create correct tree', () => {
      const symbols: SymbolInfo[] = [
        { file: 'src/index.ts', exports: [], functions: [], imports: [], docstrings: [] },
        { file: 'src/utils.ts', exports: [], functions: [], imports: [], docstrings: [] },
      ];

      const tree = buildDirectoryTree(symbols);

      expect(tree.name).toBe('root');
      expect(tree.children).toBeDefined();
      expect(tree.children?.length).toBeGreaterThan(0);
    });

    test('trimSignature should truncate long signatures', () => {
      const longSig = 'function veryLongFunctionNameWithLotsOfParameters(param1: string, param2: number, param3: boolean): ReturnType';

      const trimmed = trimSignature(longSig, 80);

      expect(trimmed.length).toBeLessThanOrEqual(80);
      expect(trimmed.endsWith('...')).toBe(true);
    });

    test('trimSignature should keep short signatures', () => {
      const shortSig = 'function short(): void';

      const trimmed = trimSignature(shortSig, 80);

      expect(trimmed).toBe(shortSig);
    });
  });
});