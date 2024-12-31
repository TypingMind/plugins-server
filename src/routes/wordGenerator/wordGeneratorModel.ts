import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type WordGeneratorResponse = z.infer<typeof WordGeneratorResponseSchema>;
export const WordGeneratorResponseSchema = z.object({
  filepath: z.string(),
});
