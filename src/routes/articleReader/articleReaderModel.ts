import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type Transcript = z.infer<typeof ArticleReaderSchema>;
export const ArticleReaderSchema = z.object({
  title: z.string(),
  content: z.string(),
});
