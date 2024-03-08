import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type Stability = z.infer<typeof StabilitySchema>;
export const StabilitySchema = z.object({
  imageUrl: z.string(),
});
