import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { StabilitySchema } from './stabilityModel';

export const stabilityRegistry = new OpenAPIRegistry();
stabilityRegistry.register('Stability', StabilitySchema);

export const stabilityRouter: Router = (() => {
  const router = express.Router();

  stabilityRegistry.registerPath({
    method: 'post',
    path: '/stability/generate-image',
    tags: ['Stability'],
    responses: createApiResponse(StabilitySchema, 'Success'),
  });

  router.post('/generate-image', async (req: Request, res: Response) => {
    try {
      const { apiKey, prompt } = req.body;
      console.log(`Received request to generate image with prompt: ${apiKey}`);
      if (!apiKey) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Missing Stability AI API Key',
          null,
          StatusCodes.BAD_REQUEST
        );
      }

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          samples: 1,
          steps: 30,
        }),
      });

      if (!response.ok) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          `Stability AI Error: ${await response.text()}`,
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const data = await response.json();
      const base64Image = data.artifacts[0].base64;

      const filename = `${uuidv4()}.png`;
      const dir = './public/images';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filePath = `${dir}/${filename}`;
      fs.writeFileSync(filePath, Buffer.from(base64Image, 'base64'));
      const ttl = 60 * 60 * 1000; // 1 hour in milliseconds
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete ${filePath}: ${err.message}`);
          } else {
            console.log(`Deleted ${filePath} after TTL expired`);
          }
        });
      }, ttl);
      const imageUrl = `http://${req.headers.host}/images/${filename}`;
      console.log(`Generated image: ${imageUrl}`);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Service is healthy',
        { imageUrl },
        StatusCodes.OK
      );
      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = `Error generating image:: $${(error as Error).message}`;
      console.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  });

  return router;
})();
