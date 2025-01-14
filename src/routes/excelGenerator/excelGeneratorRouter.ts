import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import * as ExcelJS from 'exceljs';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import path from 'path';

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

interface SheetData {
  sheetName: string;
  tables: {
    title: string;
    startCell: string;
    rows: any[][];
    columns: { name: string; type: string; format: string }[]; // types that have format, number, percent, currency
    skipHeader?: boolean;
    sorting?: { column: string; order: 'asc' | 'desc' };
    filtering?: boolean;
  }[];
}

// Helper function to convert column letter (e.g., 'A') to column index (e.g., 1)
function columnLetterToNumber(letter: string): number {
  let column = 0;
  for (let i = 0; i < letter.length; i++) {
    column = column * 26 + letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return column;
}

// Helper function to auto-fit column widths based on content
function autoFitColumns(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  rows: any[],
  numColumns: number,
  startCol: number
): void {
  for (let colIdx = 0; colIdx < numColumns; colIdx++) {
    let maxLength = 0;

    // Check the max length of the content in the column
    rows.forEach((row) => {
      const cellValue = row[colIdx];
      if (cellValue != null) {
        const cellLength = String(cellValue).length;
        maxLength = Math.max(maxLength, cellLength);
      }
    });

    // Account for the header row
    const headerCell = worksheet.getCell(startRow, startCol + colIdx).value;
    if (headerCell != null) {
      const headerLength = String(headerCell).length;
      maxLength = Math.max(maxLength, headerLength);
    }

    // Set the column width
    worksheet.getColumn(startCol + colIdx).width = maxLength + 2; // Adding some padding
  }
}

export function execGenExcelFuncs(sheetsData: SheetData[]): string {
  const workbook = new ExcelJS.Workbook();

  sheetsData.forEach(({ sheetName, tables }) => {
    const worksheet = workbook.addWorksheet(sheetName);

    tables.forEach(({ startCell, title, rows, columns, skipHeader, sorting, filtering }) => {
      const startCol = columnLetterToNumber(startCell[0]); // Convert column letter to index (e.g., 'A' -> 1)
      const startRow = parseInt(startCell.slice(1)); // Extract the row number (e.g., 'A1' -> 1)
      let rowIndex = startRow; // Set the initial row index to startRow for each table

      // Add table name row
      if (title) {
        worksheet.getCell(rowIndex, startCol).value = title;
        worksheet.mergeCells(rowIndex, startCol, rowIndex, startCol + columns.length - 1);
        worksheet.getCell(rowIndex, startCol).alignment = { horizontal: 'center', vertical: 'middle' };
        rowIndex++; // Move to the next row
      }

      // Add column headers if not skipped
      if (!skipHeader && columns) {
        columns.forEach((col, colIdx) => {
          worksheet.getCell(rowIndex, startCol + colIdx).value = col.name;
        });
        rowIndex++; // Increment row index after adding headers
      }

      // Map headers to types
      const columnTypes = columns?.map((col: any) => col.type) || [];
      const columnFormats =
        columns?.map((col: any) => {
          let format = undefined;
          switch (col.type) {
            case 'number':
              format = col.format || undefined;
              break;
            case 'percent':
              format = col.format || '0.00%'; // Default to percentage format
              break;
            case 'currency':
              format = col.format || '$#,##0'; // Default to currency format
              break;
            case 'date':
              format = col.format || undefined;
              break;
          }
          return format;
        }) || [];

      // Add rows with data types
      rows.forEach((row) => {
        row.forEach((value, colIdx) => {
          const cellType = columnTypes[colIdx];
          const format = columnFormats[colIdx];
          let cellValue: any = value != null ? value : ''; // Handle empty/null values

          // Check if the value is a formula
          if (typeof value === 'object' && value.f) {
            const formulaCell: any = { formula: value.f }; // Handle formula
            if (cellType === 'percent' || cellType === 'currency' || cellType === 'number' || cellType === 'date') {
              formulaCell.style = { numFmt: format }; // Apply number format
            }
            worksheet.getCell(rowIndex, startCol + colIdx).value = formulaCell;
          } else if (value != null) {
            // Assign cell type based on the header definition
            switch (cellType) {
              case 'number': {
                cellValue = !isNaN(Number(value)) ? Math.round(Number(value)) : value;
                worksheet.getCell(rowIndex, startCol + colIdx).value = cellValue;
                worksheet.getCell(rowIndex, startCol + colIdx).numFmt = format || '0';
                break;
              }
              case 'boolean': {
                cellValue = Boolean(value);
                worksheet.getCell(rowIndex, startCol + colIdx).value = cellValue;
                break;
              }
              case 'date': {
                const parsedDate = new Date(value);
                cellValue = !isNaN(parsedDate.getTime()) ? parsedDate : value;
                worksheet.getCell(rowIndex, startCol + colIdx).value = cellValue;
                worksheet.getCell(rowIndex, startCol + colIdx).numFmt = format || 'yyyy-mm-dd';
                break;
              }
              case 'percent': {
                cellValue = !isNaN(Number(value)) ? Number(value) : value;
                worksheet.getCell(rowIndex, startCol + colIdx).value = cellValue;
                worksheet.getCell(rowIndex, startCol + colIdx).numFmt = format || '0.00%';
                break;
              }
              case 'currency': {
                cellValue = !isNaN(Number(value)) ? Number(value) : value;
                worksheet.getCell(rowIndex, startCol + colIdx).value = cellValue;
                worksheet.getCell(rowIndex, startCol + colIdx).numFmt = format || '$#,##0';
                break;
              }
              case 'string':
              default: {
                cellValue = String(value);
                worksheet.getCell(rowIndex, startCol + colIdx).value = cellValue;
                break;
              }
            }
          } else {
            worksheet.getCell(rowIndex, startCol + colIdx).value = ''; // Handle empty value
          }
        });
        rowIndex++; // Move to the next row
      });

      // Apply sorting
      if (sorting) {
        const columnIndex = sorting.column.charCodeAt(0) - 65; // Convert 'A' to 0, 'B' to 1, etc.
        rows.sort((a, b) =>
          sorting.order === 'asc'
            ? a[columnIndex].localeCompare(b[columnIndex])
            : b[columnIndex].localeCompare(a[columnIndex])
        );
      }

      // Apply filtering (not natively supported in ExcelJS; requires client-side configuration)
      if (filtering) {
        console.warn('Filtering is not implemented in this version.');
      }

      // Auto-fit column widths
      autoFitColumns(worksheet, startRow, rows, columns.length, startCol);
    });
  });

  // Write the workbook to a file
  const fileName = `excel-file-${new Date().toISOString().replace(/\D/gi, '')}.xlsx`;
  const filePath = path.join(exportsDir, fileName);

  workbook.xlsx
    .writeFile(filePath)
    .then(() => {
      console.log('File has been written to', filePath);
    })
    .catch((err) => {
      console.error('Error writing Excel file', err);
    });

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
