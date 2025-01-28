import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Client as NotionClient } from '@notionhq/client';
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
  NotionDatabaseMakerRequestBodySchema,
  NotionDatabaseMakerResponseSchema,
  NotionDatabaseQueryPageRequestBodySchema,
  NotionDatabaseQueryPageResponseSchema,
  NotionDatabaseStructureViewerRequestBodySchema,
  NotionDatabaseStructureViewerResponseSchema,
  NotionDatabaseUpdatePageRequestBodySchema,
  NotionDatabaseUpdatePageResponseSchema,
} from './notionDatabaseModel';
import {
  buildColumnSchema,
  mapNotionRichTextProperty,
  validateDatabaseQueryConfig,
  validateNotionProperties,
} from './utils';

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

notionDatabaseRegistry.registerPath({
  method: 'post',
  path: '/notion-database/create-database',
  tags: ['Notion Database'],
  request: {
    body: createApiRequestBody(NotionDatabaseMakerRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(NotionDatabaseMakerResponseSchema, 'Success'),
});

const DEFAULT_ANNOTATIONS = {
  italic: false,
  bold: false,
  color: 'default',
  strikethrough: false,
  underline: false,
};

// Helper function to initialize the Notion client
export function initNotionClient(apiKey: string) {
  return new NotionClient({ auth: apiKey });
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
      const notion = initNotionClient(notionApiKey);
      const database = await notion.databases.retrieve({ database_id: databaseId });
      const result = {
        databaseId: databaseId,
        structure: database.properties,
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
    const { notionApiKey, databaseId, properties, databaseStructure = [] } = _req.body;

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
      const notion = initNotionClient(notionApiKey);
      // Validate properties before creating
      validateNotionProperties(databaseStructure, properties);
      const notionProperties = mapNotionPropertyRequestBody(properties);
      const result = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: notionProperties,
      });
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Page created successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        `Error: ${errorMessage}`,
        `Sorry, we couldn't create new page in the Notion database!`,
        errorMessage.includes('[Validation Error]') ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(errorServiceResponse, res);
    }
  });

  router.post('/update-page', async (_req: Request, res: Response) => {
    const { notionApiKey, pageId, properties, databaseStructure = [] } = _req.body;

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
      const notion = initNotionClient(notionApiKey);
      // Validate properties before creating
      validateNotionProperties(databaseStructure, properties);
      const notionProperties = mapNotionPropertyRequestBody(properties);
      const result = await notion.pages.update({
        page_id: pageId,
        properties: notionProperties,
      });
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Page updated successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        `Error: ${errorMessage}`,
        `Sorry, we couldn't update the page!!`,
        errorMessage.includes('[Validation Error]') ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR
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
      const notion = initNotionClient(notionApiKey);
      const result = await notion.pages.update({
        page_id: pageId,
        archived: true,
      });
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
    const {
      notionApiKey,
      databaseId,
      databaseStructure = [],
      filter = {},
      sorts = [],
      pageSize = 100,
      startCursor,
    } = _req.body;

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
      const notion = initNotionClient(notionApiKey);
      // Validate databaseStructure against filters and sorts
      validateDatabaseQueryConfig(databaseStructure, filter, sorts);
      const result = await notion.databases.query({
        database_id: databaseId,
        filter,
        sorts,
        page_size: pageSize,
        start_cursor: startCursor,
      });
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Pages query successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        `Error: ${errorMessage}`,
        `Sorry, we couldn't query the pages!`,
        errorMessage.includes('[Validation Error]') ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(errorServiceResponse, res);
    }
  });

  router.post('/create-database', async (_req: Request, res: Response) => {
    const {
      notionApiKey,
      parent,
      icon,
      cover,
      title,
      description,
      isInline = false,
      notionProperties = [],
    } = _req.body;

    if (!notionApiKey) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Notion Key is required!',
        'Please make sure you have sent the Notion Key from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    if (parent && parent.type === 'page_id' && !parent.pageId) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Page ID is required!. Please provide specific Page ID or Page URL',
        'Please make sure you have sent the Page ID from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    if (parent && parent.type === 'database_id' && !parent.databaseId) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Database ID is required!. Please provide specific Database ID or Database URL',
        'Please make sure you have sent the Database ID from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    try {
      const notion = initNotionClient(notionApiKey);

      // Initialize an empty object to hold properties
      const databaseProperties: Record<string, any> = {};
      // Iterate over notionProperties and maintain the order
      notionProperties.forEach((property: any) => {
        const schema = buildColumnSchema(property); // Assume this builds the required schema
        for (const [key, value] of Object.entries(schema.properties)) {
          databaseProperties[key] = value;
        }
      });

      const parentSchema: any = { type: parent.type };
      if (parent.type == 'page_id') {
        parentSchema.page_id = parent.pageId || undefined;
      } else if (parent.type == 'database_id') {
        parentSchema.database_id = parent.databaseId || undefined;
      }

      // Prepare the request payload to create the Notion database
      const payload: any = {
        parent: parentSchema,
        icon: { type: 'emoji', emoji: icon },
        cover: { type: 'external', external: { url: cover } },
        title: mapNotionRichTextProperty(title),
        description: mapNotionRichTextProperty(description),
        is_inline: isInline,
        properties: databaseProperties,
      };

      // Call the Notion client to create the database
      const result = await notion.databases.create(payload);

      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Database created successfully',
        result,
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        `Error: ${errorMessage}`,
        `Sorry, we couldn't create Database!`,
        errorMessage.includes('[Validation Error]') ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(errorServiceResponse, res);
    }
  });

  return router;
})();
