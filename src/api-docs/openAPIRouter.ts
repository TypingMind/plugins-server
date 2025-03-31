import express, { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '@/common/utils/envConfig';

import { generateOpenAPIDocument } from '@/api-docs/openAPIDocumentGenerator';

export const openAPIRouter: Router = (() => {
  const router = express.Router();
  const openAPIDocument = generateOpenAPIDocument();

  router.get('/swagger.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openAPIDocument);
  });

  router.use(env.MOUNT_PATH + '/', swaggerUi.serve, swaggerUi.setup(openAPIDocument));

  return router;
})();
