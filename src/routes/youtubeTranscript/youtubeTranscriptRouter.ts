import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { YoutubeTranscript } from 'youtube-transcript';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { YoutubeTranscriptRequestParamSchema, YoutubeTranscriptResponseSchema } from './youtubeTranscriptModel';

export const youtubeTranscriptRegistry = new OpenAPIRegistry();
youtubeTranscriptRegistry.register('YoutubeTranscript', YoutubeTranscriptResponseSchema);

export const youtubeTranscriptRouter: Router = (() => {
  const router = express.Router();

  youtubeTranscriptRegistry.registerPath({
    method: 'get',
    path: '/youtube-transcript/get-transcript',
    tags: ['Youtube Transcript'],
    request: {
      query: YoutubeTranscriptRequestParamSchema,
    },
    responses: createApiResponse(YoutubeTranscriptResponseSchema, 'Success'),
  });

  router.get('/get-transcript', async (_req: Request, res: Response) => {
    const { videoId } = _req.query;

    if (!videoId) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Please provide a videoId query parameter.',
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId as string);
      const textOnly = transcript.map((entry) => entry.text).join(' ');
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Service is healthy',
        { textOnly },
        StatusCodes.OK
      );
      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = `Error fetching transcript $${(error as Error).message}`;
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  });
  return router;
})();
