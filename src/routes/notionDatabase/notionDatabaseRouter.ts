import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { createApiRequestBody } from '@/api-docs/openAPIRequestBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import {
  NotionDatabaseArchivePageRequestBodySchema,
  NotionDatabaseArchivePageResponseSchema,
  NotionDatabaseCreatePageRequestBodySchema,
  NotionDatabaseCreatePageResponseSchema,
  NotionDatabaseQueryPageRequestBodySchema,
  NotionDatabaseQueryPageResponseSchema,
  NotionDatabaseStructureViewerRequestBodySchema,
  NotionDatabaseStructureViewerResponseSchema,
  NotionDatabaseUpdatePageRequestBodySchema,
  NotionDatabaseUpdatePageResponseSchema,
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
  responses: createApiResponse(NotionDatabaseCreatePageResponseSchema, 'Success'),
});

notionDatabaseRegistry.registerPath({
  method: 'patch',
  path: '/notion-database/update-page',
  tags: ['Notion Database'],
  request: {
    body: createApiRequestBody(NotionDatabaseUpdatePageRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(NotionDatabaseUpdatePageResponseSchema, 'Success'),
});

notionDatabaseRegistry.registerPath({
  method: 'patch',
  path: '/notion-database/archive-page',
  tags: ['Notion Database'],
  request: {
    body: createApiRequestBody(NotionDatabaseArchivePageRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(NotionDatabaseArchivePageResponseSchema, 'Success'),
});

notionDatabaseRegistry.registerPath({
  method: 'post',
  path: '/notion-database/query-pages',
  tags: ['Notion Database'],
  request: {
    body: createApiRequestBody(NotionDatabaseQueryPageRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(NotionDatabaseQueryPageResponseSchema, 'Success'),
});

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const DEFAULT_ANNOTATIONS = {
  italic: false,
  bold: false,
  color: 'default',
  strikethrough: false,
  underline: false,
};

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
          [propertyType]: value.map((item: any) => {
            const annotationConfigs = item.annotations || DEFAULT_ANNOTATIONS;
            return {
              type: 'text',
              text: { content: item.text.content },
              annotations: {
                italic: annotationConfigs.italic !== undefined ? annotationConfigs.italic : DEFAULT_ANNOTATIONS.italic,
                bold: annotationConfigs.bold !== undefined ? annotationConfigs.bold : DEFAULT_ANNOTATIONS.bold,
                color: annotationConfigs.color ? annotationConfigs.color : DEFAULT_ANNOTATIONS.color,
                strikethrough:
                  annotationConfigs.strikethrough !== undefined
                    ? annotationConfigs.strikethrough
                    : DEFAULT_ANNOTATIONS.strikethrough,
                underline:
                  annotationConfigs.underline !== undefined
                    ? annotationConfigs.underline
                    : DEFAULT_ANNOTATIONS.underline,
              },
            };
          }),
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
      case 'checkbox':
        notionProperties[propertyName] = {
          checkbox: value,
        };
        break;
      case 'files':
        notionProperties[propertyName] = {
          // Note: This verion only support external files
          files: value
            .filter((file: any) => file.external && file.external.url)
            .map((file: any) => ({
              name: file.name,
              external: {
                url: file.external.url,
              },
            })),
        };
        break;
      default:
        console.info(`Unknown property type: ${propertyType}`);
        break;
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

async function updatePageInNotionDatabase(apiKey: string, pageId: string, properties: object) {
  // Headers for Notion API requests
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };

  const requestBody = {
    properties: properties,
  };

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error adding update page: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(`Failed to update page: ${error.message}`);
  }
}

async function archivePageInNotionDatabase(apiKey: string, pageId: string) {
  // Headers for Notion API requests
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };

  const requestBody = {
    archived: true,
  };

  try {
    const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error removing page: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(`Failed to removing page: ${error.message}`);
  }
}

async function queryPagesInNotionDatabase(
  apiKey: string,
  databaseId: string,
  filter: object,
  sorts: any[],
  pageSize: number,
  startCursor: string | undefined
) {
  // Headers for Notion API requests
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };

  const requestBody = {
    filter: filter,
    sorts: sorts,
    page_size: pageSize,
    start_cursor: startCursor,
  };

  try {
    const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error query pages: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(`Failed to query pages: ${error.message}`);
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

  router.post('/update-page', async (_req: Request, res: Response) => {
    const { notionApiKey, pageId, properties } = _req.body;

    if (!notionApiKey) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Notion Key is required!',
        'Please make sure you have sent the Notion Key from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    if (!pageId) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Page ID is required!',
        'Please make sure you have sent the Page ID from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    const notionProperties = mapNotionPropertyRequestBody(properties);
    try {
      const result = await updatePageInNotionDatabase(notionApiKey, pageId, notionProperties);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Page updated successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = '';
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't update the page!`;
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

  router.post('/archive-page', async (_req: Request, res: Response) => {
    const { notionApiKey, pageId } = _req.body;

    if (!notionApiKey) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Notion Key is required!',
        'Please make sure you have sent the Notion Key from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    if (!pageId) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Page ID is required!',
        'Please make sure you have sent the Page ID from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    try {
      const result = await archivePageInNotionDatabase(notionApiKey, pageId);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Page removed successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = '';
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't remove the page!`;
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

  router.post('/query-pages', async (_req: Request, res: Response) => {
    const { notionApiKey, databaseId, filter = {}, sorts = [], pageSize = 100, startCursor } = _req.body;

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
      const result = await queryPagesInNotionDatabase(notionApiKey, databaseId, filter, sorts, pageSize, startCursor);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Pages query successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = '';
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't query the pages!`;
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
