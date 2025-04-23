import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { pino } from 'pino';
import { Request, Response, NextFunction } from 'express';
import { openAPIRouter } from '@/api-docs/openAPIRouter';
import errorHandler from '@/common/middleware/errorHandler';
// import rateLimiter from '@/common/middleware/rateLimiter';
import requestLogger from '@/common/middleware/requestLogger';
import { healthCheckRouter } from '@/routes/healthCheck/healthCheckRouter';
import { authRouter } from './auth/authRouter';

import { excelGeneratorRouter } from './routes/excelGenerator/excelGeneratorRouter';
import { notionDatabaseRouter } from './routes/notionDatabase/notionDatabaseRouter';
import { powerpointGeneratorRouter } from './routes/powerpointGenerator/powerpointGeneratorRouter';
import { webPageReaderRouter } from './routes/webPageReader/webPageReaderRouter';
import { wordGeneratorRouter } from './routes/wordGenerator/wordGeneratorRouter';
import { youtubeTranscriptRouter } from './routes/youtubeTranscript/youtubeTranscriptRouter';
import path from 'path';
import fs from 'fs';
const logger = pino({ name: 'server start' });
const app: Express = express();
import { POWERPOINT_EXPORTS_DIR } from '@/utils/paths';
import { WORD_EXPORTS_DIR, EXCEL_EXPORTS_DIR } from '@/utils/paths';

[WORD_EXPORTS_DIR, EXCEL_EXPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log('Creating directory:', dir);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Set the application to trust the reverse proxy
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(helmet());
// app.use(rateLimiter);
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  next();
});

// Request logging
app.use(requestLogger());

// Public routes
app.use('/health-check', healthCheckRouter);
app.use('/images', express.static('public/images'));
app.use('/auth', authRouter);

const downloadAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryToken = req.query.token;
    const authHeader = req.headers.authorization;
    const token = queryToken || (authHeader ? authHeader.split(' ')[1] : null);
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    jwt.verify(token as string, secret);
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

app.use('/powerpoint-generator/downloads', 
  downloadAuthMiddleware, 
  (req, res, next) => {
    const fileName = req.path.slice(1);
    const filePath = path.join(POWERPOINT_EXPORTS_DIR, fileName);
    
    console.log('Download Middleware Debug:');
    console.log('Request path:', req.path);
    console.log('File name:', fileName);
    console.log('Full file path:', filePath);
    console.log('Directory contents:', fs.readdirSync(POWERPOINT_EXPORTS_DIR));

    if (!fileName || !fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: 'File not found',
        debug: {
          path: filePath,
          exists: fs.existsSync(filePath),
          dirContents: fs.readdirSync(POWERPOINT_EXPORTS_DIR)
        }
      });
    }
    next();
  }, 
  express.static(POWERPOINT_EXPORTS_DIR)
);

// Add download routes for Word
app.use('/word-generator/downloads', 
  downloadAuthMiddleware, 
  (req, res, next) => {
    const fileName = req.path.slice(1);
    const filePath = path.join(WORD_EXPORTS_DIR, fileName);
    
    console.log('Word Download Debug:');
    console.log('Request path:', req.path);
    console.log('File name:', fileName);
    console.log('Full file path:', filePath);
    console.log('Directory contents:', fs.readdirSync(WORD_EXPORTS_DIR));

    if (!fileName || !fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: 'File not found',
        debug: {
          path: filePath,
          exists: fs.existsSync(filePath),
          dirContents: fs.readdirSync(WORD_EXPORTS_DIR)
        }
      });
    }
    next();
  }, 
  express.static(WORD_EXPORTS_DIR)
);

app.use('/excel-generator/downloads', 
  downloadAuthMiddleware, 
  (req, res, next) => {
    const fileName = req.path.slice(1);
    const filePath = path.join(EXCEL_EXPORTS_DIR, fileName);
    
    console.log('Excel Download Debug:');
    console.log('Request path:', req.path);
    console.log('File name:', fileName);
    console.log('Full file path:', filePath);
    console.log('Directory contents:', fs.readdirSync(EXCEL_EXPORTS_DIR));

    if (!fileName || !fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: 'File not found',
        debug: {
          path: filePath,
          exists: fs.existsSync(filePath),
          dirContents: fs.readdirSync(EXCEL_EXPORTS_DIR)
        }
      });
    }
    next();
  }, 
  express.static(EXCEL_EXPORTS_DIR)
);

// Protected API routes
const protectedRoutes = express.Router();
protectedRoutes.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authentication' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, secret);
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
});

// Apply protected routes
app.use('/youtube-transcript', protectedRoutes, youtubeTranscriptRouter);
app.use('/web-page-reader', protectedRoutes, webPageReaderRouter);
app.use('/powerpoint-generator', protectedRoutes, powerpointGeneratorRouter);
app.use('/word-generator', protectedRoutes, wordGeneratorRouter);
app.use('/excel-generator', protectedRoutes, excelGeneratorRouter);
app.use('/notion-database', protectedRoutes, notionDatabaseRouter);

// Root route (should be last)
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});
// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

export { app, logger };