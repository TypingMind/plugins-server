import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type SmtpRequest = z.infer<typeof SmtpRequestSchema>;

export const SmtpRequestSchema = z
  .object({
    host: z.string().openapi({
      description: 'SMPT email host',
      example: 'smtp.example.com',
    }),
    port: z.number().openapi({
      description: 'SMPT port',
      example: 465,
    }),
    secure: z.boolean().optional().default(false).openapi({
      description: 'Use `true` for port 465, `false` for all other ports',
    }),
    auth: z.object({
      username: z.string(),
      password: z.string(),
    }),
    mailContent: z.object({
      from: z.string().openapi({
        example: 'admin@typingmind.com, dev@typingmind.com',
        description: `The e-mail address of the sender. All e-mail addresses can be plain 'sender@server.com' or formatted 'Sender Name <sender@server.com>'`,
      }),
      to: z.string().openapi({
        example: 'admin@typingmind.com, dev@typingmind.com',
        description: 'Comma separated list of recipients e-mail addresses that will appear on the To: field',
      }),
      subject: z.string(),
      text: z.string().optional(),
      html: z.string().optional(),
      cc: z.string().optional().openapi({
        example: 'admin@typingmind.com, dev@typingmind.com',
        description: 'Comma separated list of recipients e-mail addresses that will appear on the Cc: field',
      }),
      bcc: z.string().optional().openapi({
        example: 'admin@typingmind.com, dev@typingmind.com',
        description: 'Comma separated list recipients e-mail addresses that will appear on the Bcc: field',
      }),
    }),
  })
  .openapi({
    description: 'Send SMPT Email Request',
  });

export type SmtpResponse = z.infer<typeof SmtpResponseSchema>;

export const SmtpResponseSchema = z
  .object({
    messageId: z.string().optional(),
    response: z.string().optional(),
  })
  .optional();
