import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

// Define Word Generator Response Schema
export type ExcelGeneratorResponse = z.infer<typeof ExcelGeneratorResponseSchema>;
export const ExcelGeneratorResponseSchema = z.object({
  downloadUrl: z.string().openapi({
    description: 'The file path where the generated Word document is saved.',
  }),
});

// Request Body Schema
export const ExcelGeneratorRequestBodySchema = z.object({});

export type ExcelGeneratorRequestBody = z.infer<typeof ExcelGeneratorRequestBodySchema>;
