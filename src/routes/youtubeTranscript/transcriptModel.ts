import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type Transcript = z.infer<typeof TranscriptSchema>;
export const TranscriptSchema = z.object({
  textOnly: z.string(),
});
