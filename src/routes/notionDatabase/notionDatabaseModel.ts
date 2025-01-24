import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

// Define Notion Database Structure Reader
export type NotionDatabaseStructureViewerResponse = z.infer<typeof NotionDatabaseStructureViewerResponseSchema>;
export const NotionDatabaseStructureViewerResponseSchema = z.object({});
// Request Body Schema
export const NotionDatabaseStructureViewerRequestBodySchema = z.object({
  databaseId: z.string().openapi({
    description: 'The ID of the Notion database whose structure is being viewed.',
  }),
  notionApiKey: z.string().openapi({
    description:
      'The Notion API Key getting from Notion Integration Page at https://www.notion.so/profile/integrations',
  }),
});
export type NotionDatabaseStructureViewerRequestBody = z.infer<typeof NotionDatabaseStructureViewerRequestBodySchema>;

// Define Notion Database CRUD
export type NotionDatabaseCreatePageResponse = z.infer<typeof NotionDatabaseCreatePageResponseSchema>;
export const NotionDatabaseCreatePageResponseSchema = z.object({});
// Request Body Schema
export const NotionDatabaseCreatePageRequestBodySchema = z.object({
  databaseId: z.string().openapi({
    description: 'The ID of the Notion database whose structure is being viewed.',
  }),
  notionApiKey: z.string().openapi({
    description:
      'The Notion API Key getting from Notion Integration Page at https://www.notion.so/profile/integrations',
  }),
  properties: z.array(z.object({})),
});
export type NotionDatabaseCreatePageRequestBody = z.infer<typeof NotionDatabaseCreatePageRequestBodySchema>;
