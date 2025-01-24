import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { createApiRequestBody } from '@/api-docs/openAPIRequestBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import {
  NotionDatabaseCreatePageRequestBodySchema,
  NotionDatabaseStructureViewerRequestBodySchema,
  NotionDatabaseStructureViewerResponseSchema,
} from './notionDatabaseModel';
export const COMPRESS = true;
export const notionDatabaseRegistry = new OpenAPIRegistry();
notionDatabaseRegistry.register('Notion Database', NotionDatabaseStructureViewerResponseSchema);
notionDatabaseRegistry.registerPath({
  method: 'post',
  path: '/notion-database/view-structure',
  tags: ['Notion Database'],
  request: {
    body: createApiRequestBody(NotionDatabaseStructureViewerRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(NotionDatabaseStructureViewerResponseSchema, 'Success'),
});

notionDatabaseRegistry.registerPath({
  method: 'post',
  path: '/notion-database/create-page',
  tags: ['Notion Database'],
  request: {
    body: createApiRequestBody(NotionDatabaseCreatePageRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(NotionDatabaseCreatePageRequestBodySchema, 'Success'),
});

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Helper to fetch the database structure
async function fetchDatabaseStructure(databaseId: string, apiKey: string) {
  // Headers for Notion API requests
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION, // or the version you are using
  };
  try {
    const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}`, {
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

function mapNotionPropertyRequestBody(properties: any[] = []) {
  // Construct the properties object from the notionProperties array
  const notionProperties: any = {};
  properties.forEach((property: any) => {
    const { propertyName, propertyType, value } = property;

    // Map each property type to the appropriate format for the Notion API
    switch (propertyType) {
      case 'title':
      case 'rich_text':
        notionProperties[propertyName] = {
          [propertyType]: value.map((item: any) => ({
            type: 'text',
            text: { content: item.text.content },
            annotations: item.annotations,
          })),
        };
        break;
      case 'number':
        notionProperties[propertyName] = {
          number: value,
        };
        break;
      case 'select':
      case 'status':
        notionProperties[propertyName] = {
          [propertyType]: {
            name: value.name,
          },
        };
        break;
      case 'multi_select':
        notionProperties[propertyName] = {
          multi_select: value.map((item: any) => ({
            name: item.name,
          })),
        };
        break;
      case 'date':
        notionProperties[propertyName] = {
          date: {
            start: value.start,
            end: value.end || null,
            time_zone: value.time_zone || null,
          },
        };
        break;
      case 'url':
        notionProperties[propertyName] = {
          url: value,
        };
        break;
      case 'email':
        notionProperties[propertyName] = {
          email: value,
        };
        break;
      case 'phone_number':
        notionProperties[propertyName] = {
          phone_number: value,
        };
        break;
      default:
        throw new Error(`Unknown property type: ${propertyType}`);
    }
  });

  return notionProperties;
}

async function createPageInNotionDatabase(apiKey: string, databaseId: string, properties: object) {
  // Headers for Notion API requests
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
  const requestBody = {
    parent: { database_id: databaseId },
    properties: properties,
  };

  try {
    const response = await fetch(`${NOTION_API_URL}/pages`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error adding new page to database: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(`Failed to add database to database: ${error.message}`);
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
      ``;
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

  router.post('/create-page', async (_req: Request, res: Response) => {
    const { notionApiKey, databaseId, properties } = _req.body;

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

    const notionProperties = mapNotionPropertyRequestBody(properties);
    try {
      const result = await createPageInNotionDatabase(notionApiKey, databaseId, notionProperties);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Page created successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = '';
      ``;
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't create new page in the Notion database.`;
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
