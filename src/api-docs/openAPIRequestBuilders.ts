import { z } from 'zod';

export function createApiRequestBody(
  schema: z.ZodTypeAny,
  mediaType: string = 'application/json',
  description: string = '',
  required: boolean = true
) {
  return {
    content: {
      [mediaType]: {
        schema: schema,
      },
    },
    description,
    required,
  };
}
