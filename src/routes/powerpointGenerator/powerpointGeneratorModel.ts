import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type PowerPointGeneratorResponse = z.infer<typeof PowerpointGeneratorResponseSchema>;
export const PowerpointGeneratorResponseSchema = z.object({
  filepath: z.string(),
});
