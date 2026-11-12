// Configuration for local file system storage of PDF documents.
// Managed by the Content & Grading Engine.

import { joinedPath } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Base directory for stored documents.
 * By default, this is the 'uploads' folder within the project root.
 */
const BASE_STORAGE_PATH = joinedPath(process.cwd(), 'uploads');

/**
 * Ensures the storage directory exists before any operations.
 * Should be called during application initialization.
 */
export const ensureStorageDirectory = () => {
  if (!fs.existsSync(BASE_STORAGE_PATH)) {
    fs.mkdirSync(BASE_STORAGE_PATH, { recursive: true });
  }
};

/**
 * Returns the full path for a specific file in the storage.
 * @param {string} fileName - The name of the file (e.g., 'maths_grade5_algebra.pdf')
 * @returns {string} The absolute path to the file.
 */
export const getFilePath = (fileName: string) => {
  return joinedPath(BASE_STORAGE_PATH, fileName);
};

/**
 * Verifies if a file exists in the storage.
 * @param {string} fileName
 * @returns {boolean}
 */
export const doesFileExist = (fileName: string) => {
  return fs.existsSync(joinedPath(BASE_STORAGE_PATH, fileName));
};

/**
 * Example Usage:
 *
 * ensureStorageDirectory();
 * const path = getFilePath('example.pdf');
 * if (doesFileExist('example.pdf')) { ... }
 */
