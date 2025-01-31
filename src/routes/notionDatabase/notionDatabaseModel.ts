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

// Define Notion Database Create
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

// Define Notion Database Update
export type NotionDatabaseUpdatePageResponse = z.infer<typeof NotionDatabaseUpdatePageResponseSchema>;
export const NotionDatabaseUpdatePageResponseSchema = z.object({});
// Request Body Schema
export const NotionDatabaseUpdatePageRequestBodySchema = z.object({
  pageId: z.string().openapi({
    description: 'The ID of the Notion Page whose structure is being viewed.',
  }),
  notionApiKey: z.string().openapi({
    description:
      'The Notion API Key getting from Notion Integration Page at https://www.notion.so/profile/integrations',
  }),
  properties: z.array(z.object({})),
});
export type NotionDatabaseUpdatePageRequestBody = z.infer<typeof NotionDatabaseUpdatePageRequestBodySchema>;

// Define Notion Database Delete
export type NotionDatabaseArchivePageResponse = z.infer<typeof NotionDatabaseArchivePageResponseSchema>;
export const NotionDatabaseArchivePageResponseSchema = z.object({});
// Request Body Schema
export const NotionDatabaseArchivePageRequestBodySchema = z.object({
  pageId: z.string().openapi({
    description: 'The ID of the Notion Page whose structure is being viewed.',
  }),
  notionApiKey: z.string().openapi({
    description:
      'The Notion API Key getting from Notion Integration Page at https://www.notion.so/profile/integrations',
  }),
});
export type NotionDatabaseArchivePageRequestBody = z.infer<typeof NotionDatabaseArchivePageRequestBodySchema>;

// Define Notion Database Query
export type NotionDatabaseQueryPageResponse = z.infer<typeof NotionDatabaseQueryPageResponseSchema>;
export const NotionDatabaseQueryPageResponseSchema = z.object({});
// Request Body Schema
export const NotionDatabaseQueryPageRequestBodySchema = z.object({
  databaseId: z.string().openapi({
    description: 'The ID of the Notion Database whose structure is being viewed.',
  }),
  databaseStructure: z
    .array(
      z.object({
        name: z.string().openapi({
          description: 'The name of the property.',
        }),
        type: z
          .string()
          .openapi({
            description: 'The type of the property.',
          })
          .refine(
            (value) =>
              [
                'title',
                'number',
                'multi_select',
                'select',
                'checkbox',
                'url',
                'status',
                'email',
                'date',
                'files',
                'phone_number',
                'rich_text',
              ].includes(value),
            {
              message: 'Invalid type',
            }
          ),
        options: z
          .array(
            z.object({
              name: z.string().openapi({
                description: 'Name of the option.',
              }),
            })
          )
          .optional()
          .openapi({
            description: 'List of options for select, multi-select, and status properties.',
          }),
      })
    )
    .openapi({
      description:
        'An array of properties from the Notion database structure, used to generate filter or sort criteria.',
    }),
  notionApiKey: z.string().openapi({
    description:
      'The Notion API Key getting from Notion Integration Page at https://www.notion.so/profile/integrations',
  }),
  query: z.object({}),
  sorts: z.array(z.object({})),
  pageSize: z.number().optional(),
  startCursor: z.any().optional(),
});
export type NotionDatabaseQueryPageRequestBody = z.infer<typeof NotionDatabaseQueryPageRequestBodySchema>;

// Define Notion Database Maker
export type NotionDatabaseMakerResponse = z.infer<typeof NotionDatabaseMakerResponseSchema>;
export const NotionDatabaseMakerResponseSchema = z.object({});
// Request Body Schema
export const NotionDatabaseMakerRequestBodySchema = z.object({
  notionApiKey: z.string().openapi({
    description:
      'The Notion API Key getting from Notion Integration Page at https://www.notion.so/profile/integrations',
  }),
  parent: z
    .object({
      type: z.enum(['page_id']),
      pageId: z.string().optional(),
      databaseId: z.string().optional(),
    })
    .refine((data) => data.pageId, {
      message: 'Page ID must be provided.',
    }),
  icon: z.string().optional(),
  cover: z.string().url().optional(),
  isInline: z.boolean().optional(),
  title: z
    .array(
      z.object({
        type: z.literal('text'),
        text: z
          .object({
            content: z.string().nonempty('Content is required.'),
          })
          .required(),
        annotations: z
          .object({
            italic: z.boolean().default(false),
            bold: z.boolean().default(false),
            color: z.string().default('default'),
            strikethrough: z.boolean().default(false),
            underline: z.boolean().default(false),
          })
          .default({
            italic: false,
            bold: false,
            color: 'default',
            strikethrough: false,
            underline: false,
          })
          .optional(),
      })
    )
    .nonempty('Title is required.'),
  description: z
    .array(
      z.object({
        type: z.literal('text'),
        text: z
          .object({
            content: z.string().nonempty('Content is required.'),
          })
          .required(),
        annotations: z
          .object({
            italic: z.boolean().default(false),
            bold: z.boolean().default(false),
            color: z.string().default('default'),
            strikethrough: z.boolean().default(false),
            underline: z.boolean().default(false),
          })
          .default({
            italic: false,
            bold: false,
            color: 'default',
            strikethrough: false,
            underline: false,
          })
          .optional(),
      })
    )
    .optional(),
  notionProperties: z
    .array(
      z.object({
        propertyName: z.string().nonempty('Property name is required.'),
        propertyType: z.enum([
          'title',
          'rich_text',
          'number',
          'select',
          'status',
          'multi_select',
          'date',
          'url',
          'email',
          'phone_number',
          'checkbox',
          'files',
          'formula',
        ]),
        options: z
          .array(
            z.object({
              name: z.string().nonempty('Option name is required.'),
              color: z
                .enum(['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'])
                .optional(),
            })
          )
          .optional(),
        format: z
          .enum([
            'number',
            'number_with_commas',
            'percent',
            'dollar',
            'euro',
            'pound',
            'yen',
            'ruble',
            'rupee',
            'won',
            'yuan',
            'real',
            'lira',
            'franc',
            'singapore_dollar',
            'australian_dollar',
            'canadian_dollar',
            'hong_kong_dollar',
            'new_zealand_dollar',
          ])
          .optional(),
        formula: z.string().optional(),
        dateFormat: z.string().optional(),
      })
    )
    .nonempty('Notion properties are required.'),
});
export type NotionDatabaseMakerRequestBody = z.infer<typeof NotionDatabaseMakerRequestBodySchema>;
