import { z } from 'zod';

export const apiKeyHeader = z.object({
  'x-api-key': z.string(),
});
