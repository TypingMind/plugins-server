import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

export const healthCheckRegistry = new OpenAPIRegistry();

// Skema respons yang lebih detail
const HealthCheckResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
});

export const healthCheckRouter: Router = (() => {
  const router = express.Router();

  healthCheckRegistry.registerPath({
    method: 'get',
    path: '/health-check',
    description: 'Health check endpoint',
    security: [], // Tidak memerlukan autentikasi
    responses: {
      200: {
        description: 'Successful health check',
        content: {
          'application/json': {
            schema: HealthCheckResponseSchema,
          },
        },
      },
    },
  });

  router.get('/', (_req: Request, res: Response) => {
    const serviceResponse = new ServiceResponse(
      ResponseStatus.Success, 
      'Service is healthy', 
      {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(), // Waktu uptime server
      }, 
      StatusCodes.OK
    );
    
    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
