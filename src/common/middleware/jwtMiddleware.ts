import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import path from 'path';

import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    type?: string;
  };
}

export const jwtMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log untuk debugging
    console.log('Request Path:', req.path);
    console.log('Authorization Header:', req.headers.authorization);
    console.log('Query Token:', req.query.token);

    // Daftar rute publik
    const publicRoutes = [
      '/health-check', 
      '/swagger', 
      '/swagger.json', 
      '/auth/login',
      '/images'
    ];

    // Rute download khusus
    const downloadRoutes = [
      '/powerpoint-generator/downloads',
      '/powerpoint-generator/download'
    ];

    // Lewati middleware untuk rute publik
    if (publicRoutes.some(route => req.path.includes(route))) {
      return next();
    }

    // Ambil token dari header atau query parameter atau path untuk file statis
    let token: string | undefined;
    
    // Cek header Authorization
    if (req.headers.authorization) {
      const tokenParts = req.headers.authorization.split(' ');
      if (tokenParts.length === 2 && tokenParts[0] === 'Bearer') {
        token = tokenParts[1];
      }
    }

    // Jika tidak ada token di header, cek query parameter
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    // Untuk file statis, cek token di path
    if (!token && downloadRoutes.some(route => req.path.includes(route))) {
      // Ekstrak token dari nama file
      const filename = path.basename(req.path);
      const tokenMatch = filename.match(/\[([^\]]+)\]/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
    }

    // Cek keberadaan token
    if (!token) {
      console.log('No Authorization Token');
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        'No token provided',
        null,
        StatusCodes.UNAUTHORIZED
      );
      return handleServiceResponse(serviceResponse, res);
    }

    try {
      // Verifikasi token
      console.log('Verifying Token:', token.substring(0, 10) + '...');
      
      const decoded = jwt.verify(token, JWT_SECRET) as { 
        id: string; 
        username: string; 
        type?: string;
        exp: number 
      };

      console.log('Token Decoded:', {
        id: decoded.id,
        username: decoded.username,
        type: decoded.type
      });

      // Tambahkan informasi pengguna ke request
      (req as AuthenticatedRequest).user = {
        id: decoded.id,
        username: decoded.username,
        type: decoded.type
      };

      next();
    } catch (error) {
      console.error('Token Verification Error:', error);

      let message = 'Invalid token';
      
      if (error instanceof jwt.TokenExpiredError) {
        message = 'Token expired';
      } else if (error instanceof jwt.JsonWebTokenError) {
        message = 'Invalid token signature';
      }

      const serviceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        message,
        null,
        StatusCodes.UNAUTHORIZED
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };
};
