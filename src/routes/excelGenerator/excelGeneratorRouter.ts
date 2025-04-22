import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import * as ExcelJS from 'exceljs';
import express, { NextFunction, Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import path from 'path';
import { z } from 'zod';
import { createApiRequestBody } from '@/api-docs/openAPIRequestBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { ExcelGeneratorRequestBodySchema, ExcelGeneratorResponseSchema } from './excelGeneratorModel';
import { jwtMiddleware } from '@/common/middleware/jwtMiddleware';
export const COMPRESS = true;
export const excelGeneratorRegistry = new OpenAPIRegistry();
excelGeneratorRegistry.register('ExcelGenerator', ExcelGeneratorResponseSchema);


// Registrasi path OpenAPI
excelGeneratorRegistry.registerPath({
  method: 'post',
  path: '/excel-generator/generate',
  tags: ['Excel Generator'],
  security: [{ bearerAuth: [] }], // Tambahkan autentikasi
  request: {
    body: createApiRequestBody(ExcelGeneratorRequestBodySchema, 'application/json'),
  },
  responses: {
    ...createApiResponse(ExcelGeneratorResponseSchema, 'Success'),
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            error: z.string().optional(),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            error: z.string().optional(),
          }),
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            error: z.string().optional(),
          }),
        },
      },
    },
  },
});
// Create folder to contains generated files
const exportsDir = path.join(__dirname, '../../..', 'excel-exports');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
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

const serverUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:8080';

// Ensure type safety for sheet data and excel configs
interface CellData {
  type: 'static_value' | 'formula';
  value: string | number;
}

interface ColumnConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'percent' | 'currency';
  format?: string;
}

interface TableConfig {
  title?: string;
  startCell: string;
  rows: CellData[][];
  columns: ColumnConfig[];
  skipHeader?: boolean;
}

interface SheetData {
  sheetName: string;
  tables: TableConfig[];
}

interface ExcelConfig {
  fontFamily?: string;
  tableTitleFontSize?: number;
  headerFontSize?: number;
  fontSize?: number;
  autoFitColumnWidth?: boolean;
  autoFilter?: boolean;
  borderStyle?: ExcelJS.BorderStyle | null;
  wrapText?: boolean;
}


// Default configuration with full type annotations
const DEFAULT_EXCEL_CONFIGS: ExcelConfig = {
  fontFamily: 'Calibri',
  tableTitleFontSize: 13,
  headerFontSize: 11,
  fontSize: 11,
  autoFitColumnWidth: true,
  autoFilter: false,
  wrapText: false,
  borderStyle: null,
};

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

export function execGenExcelFuncs(
  sheetsData: SheetData[], 
  excelConfigs: ExcelConfig = DEFAULT_EXCEL_CONFIGS
): Promise<string> {
  // Merge provided configs with defaults, ensuring complete coverage
  const mergedConfigs: ExcelConfig = {
    ...DEFAULT_EXCEL_CONFIGS,
    ...excelConfigs
  };

  const workbook = new ExcelJS.Workbook();
  const borderConfigs = excelConfigs.borderStyle
    ? {
        top: { style: excelConfigs.borderStyle },
        left: { style: excelConfigs.borderStyle },
        bottom: { style: excelConfigs.borderStyle },
        right: { style: excelConfigs.borderStyle },
      }
    : {};
  const titleAlignmentConfigs: any = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: excelConfigs.wrapText,
  };
  const titleFontConfigs: any = {
    name: excelConfigs.fontFamily,
    bold: true,
    size: excelConfigs.tableTitleFontSize,
  };
  const headerAligmentConfigs: any = {
    wrapText: excelConfigs.wrapText,
    horizontal: 'center',
    vertical: 'middle',
  };
  const headerFontConfigs: any = {
    name: excelConfigs.fontFamily,
    bold: true,
    size: excelConfigs.headerFontSize,
  };
  const cellAlignmentConfigs: any = {
    wrapText: excelConfigs.wrapText,
  };
  const cellFontConfigs: any = {
    name: excelConfigs.fontFamily,
    size: excelConfigs.fontSize,
  };

  sheetsData.forEach(({ sheetName, tables }) => {
    const worksheet = workbook.addWorksheet(sheetName);
    tables.forEach(({ startCell, title, rows = [], columns = [], skipHeader }) => {
      const startCol = columnLetterToNumber(startCell[0]); // Convert column letter to index (e.g., 'A' -> 1)
      const startRow = parseInt(startCell.slice(1)); // Extract the row number (e.g., 'A1' -> 1)
      let rowIndex = startRow; // Set the initial row index to startRow for each table

      // Add table name row
      if (title) {
        const startCell = worksheet.getCell(rowIndex, startCol);
        startCell.value = title;
        worksheet.mergeCells(rowIndex, startCol, rowIndex, startCol + columns.length - 1);
        startCell.alignment = titleAlignmentConfigs;
        startCell.font = titleFontConfigs;
        startCell.border = borderConfigs;
        rowIndex++; // Move to the next row
      }

      // Add column headers if not skipped
      if (!skipHeader && columns) {
        columns.forEach((col, colIdx) => {
          const cell = worksheet.getCell(rowIndex, startCol + colIdx);
          cell.value = col.name;
          cell.alignment = headerAligmentConfigs;
          cell.font = headerFontConfigs;
          cell.border = borderConfigs;
        });
        rowIndex++; // Increment row index after adding headers
      }

      // Map headers to types
      const columnTypes = columns.map((col: any) => col.type) || [];
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
      rows.forEach((rowData) => {
        rowData.forEach((cellData, colIdx) => {
          const { type = 'static_value', value } = cellData;
          const valueType = columnTypes[colIdx];
          const format = columnFormats[colIdx];
          let cellValue: any = value != null ? value : ''; // Handle empty/null values
          const cell = worksheet.getCell(rowIndex, startCol + colIdx);
          // Check if the value is a formula
          if (type == 'formula') {
            const formulaCell: any = { formula: cellValue }; // Handle formula
            if (valueType === 'percent' || valueType === 'currency' || valueType === 'number' || valueType === 'date') {
              cell.numFmt = format; // Apply number format
            }
            cell.value = formulaCell;
          } else {
            // Assign cell type based on the header definition
            switch (valueType) {
              case 'number': {
                cellValue = !isNaN(Number(cellValue)) ? Math.round(Number(cellValue)) : cellValue;
                cell.value = cellValue;
                cell.numFmt = format || '0';
                break;
              }
              case 'boolean': {
                cellValue = Boolean(cellValue);
                cell.value = cellValue;
                break;
              }
              case 'date': {
                const parsedDate = new Date(cellValue);
                cellValue = !isNaN(parsedDate.getTime()) ? parsedDate : cellValue;
                cell.value = cellValue;
                cell.numFmt = format || 'yyyy-mm-dd';
                break;
              }
              case 'percent': {
                cellValue = !isNaN(Number(cellValue)) ? Number(cellValue) : cellValue;
                cell.value = cellValue;
                cell.numFmt = format || '0.00%';
                break;
              }
              case 'currency': {
                cellValue = !isNaN(Number(cellValue)) ? Number(cellValue) : cellValue;
                cell.value = cellValue;
                cell.numFmt = format || '$#,##0';
                break;
              }
              case 'string':
              default: {
                cellValue = String(cellValue);
                cell.value = cellValue;
                break;
              }
            }
          }

          // Apply styles to the cell
          cell.font = cellFontConfigs;
          cell.border = borderConfigs;
          cell.alignment = cellAlignmentConfigs;
        });
        rowIndex++; // Move to the next row
      });

      // Apply auto-filter
      if (excelConfigs.autoFilter) {
        const lastCol = startCol + columns.length - 1; // Calculate the last column
        worksheet.autoFilter = {
          from: { row: startRow + 1, column: startCol }, // Start from header row
          to: { row: rowIndex - 1, column: lastCol }, // End at the last row of data
        };
      }

      // Auto-fit column widths
      if (excelConfigs.autoFitColumnWidth) {
        autoFitColumns(worksheet, startRow, rows, columns.length, startCol);
      }
    });
  });

  // Write the workbook to a file
  const fileName = `maia-excel-${new Date().toISOString().replace(/\D/gi, '')}.xlsx`;
  const filePath = path.join(exportsDir, fileName);


    return new Promise<string>((resolve, reject) => {
    workbook.xlsx
      .writeFile(filePath)
      .then(() => {
        console.log('File has been written to', filePath);
        resolve(fileName);
      })
      .catch((err) => {
        console.error('Error writing Excel file', err);
        reject(err);
      });
  });
}

export const excelGeneratorRouter: Router = (() => {
  const router = express.Router();
  // Middleware kustom untuk file statis dengan token
      const tokenizedStaticMiddleware = (req: Request, res: Response, next: NextFunction) => {
        // Tambahkan token ke query jika ada di path
        const token = req.query.token;
        if (token) {
          return jwtMiddleware()(req, res, next);
        }
        next();
      };
    
    // Gunakan middleware JWT untuk route downloads
      router.use('/downloads', 
        tokenizedStaticMiddleware,
        express.static(exportsDir, {
          setHeaders: (res, filePath) => {
            const isValidFile = filePath.startsWith(exportsDir);
            if (!isValidFile) {
              res.status(403).json({ 
                message: 'Access denied' 
              });
            }
          },
          fallthrough: false
        })
      );

  router.post('/generate', async (req: Request, res: Response) => {
    const { sheetsData, excelConfigs } = req.body; // TODO: extract excel config object from request body
  // Add explicit null/undefined check
  if (!sheetsData || !Array.isArray(sheetsData) || sheetsData.length === 0) {
    const validateServiceResponse = new ServiceResponse(
      ResponseStatus.Failed,
      '[Validation Error] Sheets data is required!',
      'Please make sure you have sent the excel sheets content generated from TypingMind.',
      StatusCodes.BAD_REQUEST
    );
    return handleServiceResponse(validateServiceResponse, res);
  }

    try {
    // console.log('Received request body:', JSON.stringify(req.body, null, 2));
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null;
    const { 
      sheetsData, 
      excelConfigs = {} // Provide a default empty object
    } = req.body || {};
     // Comprehensive input validation
     if (!sheetsData || !Array.isArray(sheetsData) || sheetsData.length === 0) {
      return handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Validation Error',
          'Sheets data is required and must be a non-empty array',
          StatusCodes.BAD_REQUEST
        ),
        res
      );
    }

      // Create a completely safe configuration object with fallbacks
    const validatedExcelConfigs: ExcelConfig = {
      fontFamily: excelConfigs?.fontFamily ?? DEFAULT_EXCEL_CONFIGS.fontFamily,
      tableTitleFontSize: excelConfigs?.titleFontSize ?? DEFAULT_EXCEL_CONFIGS.tableTitleFontSize,
      headerFontSize: excelConfigs?.headerFontSize ?? DEFAULT_EXCEL_CONFIGS.headerFontSize,
      fontSize: excelConfigs?.fontSize ?? DEFAULT_EXCEL_CONFIGS.fontSize,
      autoFilter: excelConfigs?.autoFilter ?? DEFAULT_EXCEL_CONFIGS.autoFilter,
      borderStyle: 
        excelConfigs?.borderStyle && excelConfigs.borderStyle !== 'none'
          ? excelConfigs.borderStyle
          : DEFAULT_EXCEL_CONFIGS.borderStyle,
      wrapText: excelConfigs?.wrapText ?? DEFAULT_EXCEL_CONFIGS.wrapText,
      autoFitColumnWidth: excelConfigs?.autoFitColumnWidth ?? DEFAULT_EXCEL_CONFIGS.autoFitColumnWidth,
    };
       // Generate Excel file
      const fileName = await execGenExcelFuncs(sheetsData, validatedExcelConfigs);

      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'File generated successfully',
        {
          downloadUrl: `${serverUrl}/excel-generator/downloads/${fileName}?token=${token}`,
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
