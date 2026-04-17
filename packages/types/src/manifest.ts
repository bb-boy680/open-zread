/**
 * File Manifest Types
 *
 * Scanner output - list of files with metadata
 */

/**
 * FileManifest - Scanner output
 */
export interface FileManifest {
  files: Array<{
    path: string;
    hash: string;
    size: number;
    language: string;
    lastModified: string;
  }>;
  totalFiles: number;
  totalSize: number;
}

/**
 * FileInfo - Single file info
 */
export interface FileInfo {
  path: string;
  hash: string;
  size: number;
  language: string;
  lastModified: string;
}