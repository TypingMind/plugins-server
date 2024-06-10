import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { YoutubeTranscript } from 'youtube-transcript';

import { apiKeyHeader } from '@/api-docs/openAPIHeaderBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { apiKeyHandler } from '@/common/middleware/apiKeyHandler';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { TranscriptSchema } from './transcriptModel';

export const transcriptRegistry = new OpenAPIRegistry();
transcriptRegistry.register('Transcript', TranscriptSchema);

export const transcriptRouter: Router = (() => {
  const router = express.Router();

  router.use(apiKeyHandler);

  transcriptRegistry.registerPath({
    method: 'get',
    path: '/transcript',
    tags: ['Youtube Transcript'],
    request: {
      headers: [apiKeyHeader],
    },
    responses: createApiResponse(TranscriptSchema, 'Success'),
  });

  router.get('/', async (_req: Request, res: Response) => {
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
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR),
        res
      );
    }
  });
  return router;
})();
