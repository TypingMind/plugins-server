import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import * as cheerio from 'cheerio';
import express, { Request, Response, Router } from 'express';
import got from 'got';
import { StatusCodes } from 'http-status-codes';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { WebContentSchema } from './webContentModel';

export const webContentRegistry = new OpenAPIRegistry();
webContentRegistry.register('WebContent', WebContentSchema);

const removeUnwantedElements = (_cheerio: any) => {
  const elementsToRemove = [
    'footer',
    'header',
    'nav',
    'script',
    'style',
    'link',
    'meta',
    'noscript',
    'img',
    'picture',
    'video',
    'audio',
    'iframe',
    'object',
    'embed',
    'param',
    'track',
    'source',
    'canvas',
    'map',
    'area',
    'svg',
    'math',
    'table',
    'caption',
    'colgroup',
    'col',
  ];

  elementsToRemove.forEach((element) => _cheerio(element).remove());
};

const fetchAndCleanContent = async (url: string) => {
  const { body } = await got(url);
  const $ = cheerio.load(body);
  const title = $('title').text();
  removeUnwantedElements($);
  const bodyContent = $.text().replace(/\s\s+/g, ' ').trim();

  return { title, content: bodyContent };
};

export const webContentRouter: Router = (() => {
  const router = express.Router();

  webContentRegistry.registerPath({
    method: 'get',
    path: '/content',
    tags: ['WebContent'],
    responses: createApiResponse(WebContentSchema, 'Success'),
  });

  router.get('/', async (_req: Request, res: Response) => {
    const { url } = _req.query;

    if (typeof url !== 'string') {
      return new ServiceResponse(ResponseStatus.Failed, 'URL must be a string', null, StatusCodes.BAD_REQUEST);
    }

    try {
      const content = await fetchAndCleanContent(url);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Service is healthy',
        content,
        StatusCodes.OK
      );
      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      console.error(`Error fetching content ${(error as Error).message}`);
      const errorMessage = `Error fetching content $${(error as Error).message}`;
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  });

  return router;
})();
