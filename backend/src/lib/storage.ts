// Local file-system storage for curriculum PDFs (TASK-02).
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export const ensureStorageDirectory = () => {
  fs.mkdirSync(config.uploadDir, { recursive: true });
};

/** Absolute path of a stored file. Rejects names that try to escape the upload directory. */
export const getFilePath = (storedName: string) => {
  const full = path.resolve(config.uploadDir, storedName);
  if (!full.startsWith(config.uploadDir + path.sep)) throw new Error('Invalid file name');
  return full;
};

export const doesFileExist = (storedName: string) => fs.existsSync(getFilePath(storedName));

export const deleteFile = (storedName: string) => {
  try {
    fs.unlinkSync(getFilePath(storedName));
  } catch {
    /* already gone */
  }
};
