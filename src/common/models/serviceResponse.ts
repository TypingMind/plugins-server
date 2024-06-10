import { z } from 'zod';

export enum ResponseStatus {
  Success,
  Failed,
}

export class ServiceResponse<T = null> {
  success: boolean;
  message: string;
  responseObject: T;
  statusCode: number;

  constructor(status: ResponseStatus, message: string, responseObject: T, statusCode: number) {
    this.success = status === ResponseStatus.Success;
    this.message = message;
    this.responseObject = responseObject;
    this.statusCode = statusCode;
  }
}

export const ServiceResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
  success: boolean = true,
  statusCode: number = 200
) =>
  z.object({
    success: z.boolean().openapi({
      example: success,
    }),
    message: z.string(),
    responseObject: dataSchema.optional(),
    statusCode: z.number().openapi({
      example: statusCode,
    }),
  });
