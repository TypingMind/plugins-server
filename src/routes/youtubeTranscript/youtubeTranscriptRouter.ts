import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { YoutubeTranscript } from 'youtube-transcript';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { YoutubeTranscriptRequestParamSchema, YoutubeTranscriptResponseSchema } from './youtubeTranscriptModel';
import { z } from 'zod';

export const youtubeTranscriptRegistry = new OpenAPIRegistry();
youtubeTranscriptRegistry.register('YoutubeTranscript', YoutubeTranscriptResponseSchema);

export const youtubeTranscriptRouter: Router = (() => {
  const router = express.Router();

  youtubeTranscriptRegistry.registerPath({
    method: 'get',
    path: '/youtube-transcript/get-transcript',
    tags: ['Youtube Transcript'],
    security: [{ bearerAuth: [] }], // Tambahkan autentikasi
    request: {
      query: YoutubeTranscriptRequestParamSchema,
    },
    responses: {
      ...createApiResponse(YoutubeTranscriptResponseSchema, 'Success'),
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
              error: z.string().optional(),
            }),
          },
        },
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
              error: z.string().optional(),
            }),
          },
        },
      },
    },
  });

  router.get('/get-transcript', async (_req: Request, res: Response) => {
    console.log('Head to get-transcript');
    const { videoId } = _req.query;
    console.log('Head to get-transcript -> ', videoId);

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
      console.log('Transcript response -> ', JSON.stringify(transcript));
      const textOnly = transcript.map((entry) => entry.text).join(' ');
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Transcript fetched successfully',
        { textOnly },
        StatusCodes.OK
      );

      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = `Error fetching transcript $${(error as Error).message}`;
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  });
  return router;
})();
