import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import express, { Request, Response, Router } from 'express';
import got from 'got';
import { StatusCodes } from 'http-status-codes';
import { JSDOM } from 'jsdom';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { ArticleReaderSchema } from './articleReaderModel';

export const articleReaderRegistry = new OpenAPIRegistry();
articleReaderRegistry.register('ArticleReader', ArticleReaderSchema);

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
  ];

  elementsToRemove.forEach((element) => _cheerio(element).remove());
};

const fetchAndCleanContent = async (url: string) => {
  const { body } = await got(url);
  const $ = cheerio.load(body);
  const title = $('title').text();
  removeUnwantedElements($);
  const doc = new JSDOM($.text(), {
    url: url,
  });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();

  return { title, content: article ? article.textContent : '' };
};

export const articleReaderRouter: Router = (() => {
  const router = express.Router();

  articleReaderRegistry.registerPath({
    method: 'get',
    path: '/content',
    tags: ['Article Reader'],
    responses: createApiResponse(ArticleReaderSchema, 'Success'),
  });

  router.get('/', async (_req: Request, res: Response) => {
    const { url } = _req.query;

    if (typeof url !== 'string') {
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        'URL must be a string',
        null,
        StatusCodes.BAD_REQUEST
      );
      handleServiceResponse(serviceResponse, res);
      return;
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
      return;
    } catch (error) {
      console.error(`Error fetching content ${(error as Error).message}`);
      const errorMessage = `Error fetching content ${(error as Error).message}`;
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );

      handleServiceResponse(serviceResponse, res);
      return;
    }
  });

  return router;
})();
