import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import path from 'path';
import XLSX from 'xlsx';

import { createApiRequestBody } from '@/api-docs/openAPIRequestBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { ExcelGeneratorRequestBodySchema, ExcelGeneratorResponseSchema } from './excelGeneratorModel';
export const COMPRESS = true;
export const excelGeneratorRegistry = new OpenAPIRegistry();
excelGeneratorRegistry.register('ExcelGenerator', ExcelGeneratorResponseSchema);
excelGeneratorRegistry.registerPath({
  method: 'post',
  path: '/excel-generator/generate',
  tags: ['Excel Generator'],
  request: {
    body: createApiRequestBody(ExcelGeneratorRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(ExcelGeneratorResponseSchema, 'Success'),
});

// Create folder to contains generated files
const exportsDir = path.join(__dirname, '../../..', 'excel-exports');

// Ensure the exports directory exists
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Cron job to delete files older than 1 hour
cron.schedule('0 * * * *', () => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  // Read the files in the exports directory
  fs.readdir(exportsDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${exportsDir}:`, err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(exportsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file ${filePath}:`, err);
          return;
        }

        // Check if the file is older than 1 hour
        if (now - stats.mtime.getTime() > oneHour) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${filePath}:`, err);
            } else {
              console.log(`Deleted file: ${filePath}`);
            }
          });
        }
      });
    });
  });
});

const serverUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

interface Table {
  startCell: string;
  rows: string[][];
  columns?: string[];
  sorting?: { column: string; order: 'asc' | 'desc' };
  formulas?: { column: string; formula: string }[];
  filtering?: { column: string; criteria: string }[];
  skipHeader?: boolean;
}

interface SheetData {
  sheetName: string;
  tables: Table[];
}

export function execGenExcelFuncs(sheetsData: SheetData[]): string {
  const workbook = XLSX.utils.book_new();

  sheetsData.forEach(({ sheetName, tables }) => {
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    tables.forEach(({ startCell, rows, columns, skipHeader, sorting, formulas, filtering }) => {
      const decodedCell = XLSX.utils.decode_cell(startCell);
      const startRow = decodedCell.r; // Row index (0-based)
      const startCol = decodedCell.c; // Column index (0-based)

      let rowIndex = 0; // Reset rowIndex for each table

      // Add column headers if not skipped
      if (!skipHeader && columns) {
        XLSX.utils.sheet_add_aoa(worksheet, [columns], { origin: { c: startCol, r: startRow + rowIndex } });
        rowIndex++; // Increment row index after adding headers
      }

      // Add rows
      XLSX.utils.sheet_add_aoa(worksheet, rows, { origin: { c: startCol, r: startRow + rowIndex } });
      rowIndex += rows.length; // Increment row index by the number of rows added

      // Apply sorting
      if (sorting) {
        const columnIndex = sorting.column.charCodeAt(0) - 65; // Convert 'A' to 0, 'B' to 1, etc.
        rows.sort((a, b) =>
          sorting.order === 'asc'
            ? a[columnIndex].localeCompare(b[columnIndex])
            : b[columnIndex].localeCompare(a[columnIndex])
        );
      }

      // Apply formulas
      if (formulas) {
        formulas.forEach(({ column, formula }) => {
          const colIndex = XLSX.utils.decode_col(column);
          rows.forEach((_, rowIdx) => {
            const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: startRow + rowIdx + (skipHeader ? 0 : 1) }); // Adjust row for header
            worksheet[cellRef] = { t: 'n', f: formula };
          });
        });
      }

      // Apply filtering (not natively supported in XLSX; requires client-side configuration)
      if (filtering) {
        console.warn('Filtering is not implemented in this version.');
      }
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const fileName = `excel-file-${new Date().toISOString().replace(/\D/gi, '')}.xlsx`;
  const filePath = path.join(exportsDir, fileName);

  XLSX.writeFile(workbook, filePath);

  return fileName;
}

export const excelGeneratorRouter: Router = (() => {
  const router = express.Router();
  // Static route for downloading files
  router.use('/downloads', express.static(exportsDir));

  router.post('/generate', async (_req: Request, res: Response) => {
    const { sheetsData } = _req.body; // TODO: extract excel config object from request body
    if (!sheetsData.length) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Sheets data is required!',
        'Please make sure you have sent the excel sheets content generated from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    try {
      const fileName = execGenExcelFuncs(sheetsData);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'File generated successfully',
        {
          downloadUrl: `${serverUrl}/excel-generator/downloads/${fileName}`,
        },
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = '';
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't generate excel file.`;
      }
      const errorServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        `Error ${errorMessage}`,
        responseObject,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(errorServiceResponse, res);
    }
  });
  return router;
})();
