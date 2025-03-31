import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { pino } from 'pino';
import { env } from '@/common/utils/envConfig';

import { openAPIRouter } from '@/api-docs/openAPIRouter';
import errorHandler from '@/common/middleware/errorHandler';
import rateLimiter from '@/common/middleware/rateLimiter';
import requestLogger from '@/common/middleware/requestLogger';
import { healthCheckRouter } from '@/routes/healthCheck/healthCheckRouter';

import { excelGeneratorRouter } from './routes/excelGenerator/excelGeneratorRouter';
import { notionDatabaseRouter } from './routes/notionDatabase/notionDatabaseRouter';
import { powerpointGeneratorRouter } from './routes/powerpointGenerator/powerpointGeneratorRouter';
import { webPageReaderRouter } from './routes/webPageReader/webPageReaderRouter';
import { wordGeneratorRouter } from './routes/wordGenerator/wordGeneratorRouter';
import { youtubeTranscriptRouter } from './routes/youtubeTranscript/youtubeTranscriptRouter';
const logger = pino({ name: 'server start' });
const app: Express = express();

// Set the application to trust the reverse proxy
app.set('trust proxy', true);
// Middlewares
// app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cors());
app.use(helmet());
app.use(rateLimiter);
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  next();
});
// Request logging
app.use(requestLogger());

// Routes
app.use(env.MOUNT_PATH + '/health-check', healthCheckRouter);
app.use(env.MOUNT_PATH + '/images', express.static('public/images'));
app.use(env.MOUNT_PATH + '/youtube-transcript', youtubeTranscriptRouter);
app.use(env.MOUNT_PATH + '/web-page-reader', webPageReaderRouter);
app.use(env.MOUNT_PATH + '/powerpoint-generator', powerpointGeneratorRouter);
app.use(env.MOUNT_PATH + '/word-generator', wordGeneratorRouter);
app.use(env.MOUNT_PATH + '/excel-generator', excelGeneratorRouter);
app.use(env.MOUNT_PATH + '/notion-database', notionDatabaseRouter);

// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

export { app, logger };
