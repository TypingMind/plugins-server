import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { YoutubeTranscript } from 'youtube-transcript';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { TranscriptSchema } from './transcriptModel';

export const transcriptRegistry = new OpenAPIRegistry();
transcriptRegistry.register('Transcript', TranscriptSchema);

export const transcriptRouter: Router = (() => {
  const router = express.Router();

  transcriptRegistry.registerPath({
    method: 'get',
    path: '/youtube-transcript',
    tags: ['YouTube Transcript'],
    parameters: [
      {
        name: 'query',
        in: 'query',
        description: 'The YouTube video URL to fetch the transcript for.',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ],
    responses: createApiResponse(TranscriptSchema, 'Success'),
  });

  router.get('/', async (_req: Request, res: Response) => {
    const videoUrl: string = _req.query.query as string;

    if (!videoUrl) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Please provide a videoId query parameter.',
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoUrl as string);
      const textOnly = transcript.map((entry) => entry.text).join(' ');
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Service is healthy',
        {
          videoUrlOrId: videoUrl,
          textOnly,
        },
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
