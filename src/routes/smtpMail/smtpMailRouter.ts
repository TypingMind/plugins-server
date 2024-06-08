import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import nodemailer from 'nodemailer';

import { apiKeyHeader } from '@/api-docs/openAPIHeaderBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { apiKeyHandler } from '@/common/middleware/apiKeyHandler';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse, validateRequestBody } from '@/common/utils/httpHandlers';

import { SmtpRequest, SmtpRequestSchema, SmtpResponseSchema } from './smtpMailModel';

export const smtpMailRegistry = new OpenAPIRegistry();
smtpMailRegistry.register('SmtpRequest', SmtpRequestSchema);
smtpMailRegistry.register('SmtpResponse', SmtpResponseSchema);

smtpMailRegistry.registerPath({
  method: 'post',
  path: '/send-smtp-mail',
  tags: ['SMTP Mail'],
  request: {
    headers: [apiKeyHeader],
    body: {
      content: {
        'application/json': {
          schema: SmtpRequestSchema,
        },
      },
    },
  },
  responses: {
    ...createApiResponse(SmtpResponseSchema, 'OK'),
    ...createApiResponse(SmtpResponseSchema, 'Please input your x-api-key', StatusCodes.UNAUTHORIZED),
  },
});

export const smtpMailRouter: Router = (() => {
  const router = express.Router();

  router.use(apiKeyHandler);

  router.post('/', validateRequestBody(SmtpRequestSchema), async (_req: Request, res: Response) => {
    const { auth, host, port, secure, mailContent }: SmtpRequest = _req.body;
    try {
      const transporter = nodemailer.createTransport({
        auth: {
          user: auth.username,
          pass: auth.password,
        },
        port: port,
        host: host,
        secure: secure,
      });

      const mailOptions = {
        from: mailContent.from,
        to: mailContent.to,
        subject: mailContent.subject || '',
        text: mailContent.text || '',
        html: mailContent.html || '',
        cc: mailContent.cc,
        bcc: mailContent.bcc,
      };

      const info = await transporter.sendMail(mailOptions);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Your mail is sent!',
        {
          messageId: info.messageId,
          response: info.response,
        },
        StatusCodes.OK
      );
      handleServiceResponse(serviceResponse, res);
    } catch (error) {
      console.log(`${(error as Error).stack}`);
      const errorMessage = `Error sending your email: ${(error as Error).message}`;
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR),
        res
      );
    }
  });
  return router;
})();
