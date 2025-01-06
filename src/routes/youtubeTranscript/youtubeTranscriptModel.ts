import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type YoutubeTranscriptResponse = z.infer<typeof YoutubeTranscriptResponseSchema>;
export const YoutubeTranscriptResponseSchema = z.object({
  textOnly: z.string(),
});

export type YoutubeTranscriptRequestParam = z.infer<typeof YoutubeTranscriptRequestParamSchema>;
export const YoutubeTranscriptRequestParamSchema = z.object({
  videoId: z.string().describe('The id of the Youtube video to retrieve the transcript'),
});
