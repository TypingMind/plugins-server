import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
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

async function execGenExcelFuncs() {
  // TOOD: Implement code logic here
  const fileName = `excel-file-${new Date().toISOString().replace(/\D/gi, '')}.docx`;
  return fileName;
}

export const excelGeneratorRouter: Router = (() => {
  const router = express.Router();
  // Static route for downloading files
  router.use('/downloads', express.static(exportsDir));

  router.post('/generate', async (_req: Request, res: Response) => {
    const { sheets = [] } = _req.body; // TODO: extract excel config object from request body
    if (!sheets.length) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Sheets data is required!',
        'Please make sure you have sent the excel sheets content generated from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    try {
      const fileName = await execGenExcelFuncs();
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
