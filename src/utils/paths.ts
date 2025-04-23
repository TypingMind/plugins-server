import path from 'path';

// Get the root directory of the project
const ROOT_DIR = path.resolve(__dirname, '../../');

export const POWERPOINT_EXPORTS_DIR = path.join(ROOT_DIR, 'powerpoint-exports');
export const WORD_EXPORTS_DIR = path.join(ROOT_DIR, 'word-exports');
export const EXCEL_EXPORTS_DIR = path.join(ROOT_DIR, 'excel-exports');