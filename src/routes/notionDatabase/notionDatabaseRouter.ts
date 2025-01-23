import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { createApiRequestBody } from '@/api-docs/openAPIRequestBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import {
  NotionDatabaseStructureViewerRequestBodySchema,
  NotionDatabaseStructureViewerResponseSchema,
} from './notionDatabaseModel';
export const COMPRESS = true;
export const notionDatabaseRegistry = new OpenAPIRegistry();
notionDatabaseRegistry.register('Notion Database Structure Viewer', NotionDatabaseStructureViewerResponseSchema);
notionDatabaseRegistry.registerPath({
  method: 'post',
  path: '/notion-database/view-structure',
  tags: ['Notion Database'],
  request: {
    body: createApiRequestBody(NotionDatabaseStructureViewerRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(NotionDatabaseStructureViewerResponseSchema, 'Success'),
});

// Helper to fetch the database structure
async function fetchDatabaseStructure(databaseId: string, apiKey: string) {
  // Headers for Notion API requests
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28', // or the version you are using
  };
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`Error fetching database structure: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(JSON.stringify(data));
    return data;
  } catch (error: any) {
    throw new Error(`Failed to fetch database structure: ${error.message}`);
  }
}

export const notionDatabaseRouter: Router = (() => {
  const router = express.Router();

  router.post('/view-structure', async (_req: Request, res: Response) => {
    const { notionApiKey, databaseId } = _req.body;
    if (!notionApiKey) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Notion Key is required!',
        'Please make sure you have sent the Notion Key from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    if (!databaseId) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Database ID is required!',
        'Please make sure you have sent the Database ID from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    try {
      const dbStructure = await fetchDatabaseStructure(databaseId, notionApiKey);
      const result = {
        databaseId: databaseId,
        structure: dbStructure.properties,
      };
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Structure retrieved successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = '';
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't get the database structure.`;
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
