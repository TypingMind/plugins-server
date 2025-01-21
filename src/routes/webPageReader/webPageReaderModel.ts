import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type WebPageReaderResponse = z.infer<typeof WebPageReaderResponseSchema>;
export const WebPageReaderResponseSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export type WebPageReaderRequestParam = z.infer<typeof WebPageReaderRequestParamSchema>;
export const WebPageReaderRequestParamSchema = z.object({
  url: z.string().describe('The URL of the web page to retrieve content from'),
});
