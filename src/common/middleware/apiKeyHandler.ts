import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { env } from '@/common/utils/envConfig';

import { ResponseStatus, ServiceResponse } from '../models/serviceResponse';
import { handleServiceResponse } from '../utils/httpHandlers';

export const apiKeyHandler = (req: Request, res: Response, next: NextFunction) => {
  const apiKeyHeader = req.headers['x-api-key'];
  if (!apiKeyHeader || apiKeyHeader !== env.API_KEY) {
    return handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Failed,
        'Please input your x-api-key in the header!',
        null,
        StatusCodes.UNAUTHORIZED
      ),
      res
    );
  }
  next();
};
