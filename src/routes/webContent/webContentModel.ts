import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type Transcript = z.infer<typeof WebContentSchema>;
export const WebContentSchema = z.object({
  title: z.string(),
  content: z.string(),
});
