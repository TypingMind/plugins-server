import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { pino } from 'pino';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { openAPIRouter } from '@/api-docs/openAPIRouter';
import errorHandler from '@/common/middleware/errorHandler';
import rateLimiter from '@/common/middleware/rateLimiter';
import requestLogger from '@/common/middleware/requestLogger';
import { jwtMiddleware } from '@/common/middleware/jwtMiddleware';
import { healthCheckRouter } from '@/routes/healthCheck/healthCheckRouter';

// Import routers
import { excelGeneratorRouter } from './routes/excelGenerator/excelGeneratorRouter';
import { notionDatabaseRouter } from './routes/notionDatabase/notionDatabaseRouter';
import { powerpointGeneratorRouter } from './routes/powerpointGenerator/powerpointGeneratorRouter';
import { webPageReaderRouter } from './routes/webPageReader/webPageReaderRouter';
import { wordGeneratorRouter } from './routes/wordGenerator/wordGeneratorRouter';
import { youtubeTranscriptRouter } from './routes/youtubeTranscript/youtubeTranscriptRouter';
import authRouter from './auth/authRouter';

const logger = pino({ name: 'server start' });
const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Pastikan secret key ada
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

// Middlewares
app.use(cors());
app.use(helmet());
// app.use(rateLimiter);
app.use(bodyParser.json());
app.use(requestLogger());

// Public Routes
app.use('/health-check', healthCheckRouter);
app.use('/auth', authRouter); // Tambahkan route autentikasi
app.use('/images', express.static('public/images'));



app.use([
  '/youtube-transcript', 
  '/web-page-reader', 
  '/powerpoint-generator/generate', 
  '/word-generator', 
  '/excel-generator', 
  '/notion-database'
], jwtMiddleware());


// Protected Routes
app.use('/youtube-transcript', youtubeTranscriptRouter);
app.use('/web-page-reader', webPageReaderRouter);
app.use('/powerpoint-generator', powerpointGeneratorRouter);
app.use('/word-generator', wordGeneratorRouter);
app.use('/excel-generator', excelGeneratorRouter);
app.use('/notion-database', notionDatabaseRouter);
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

export { app, logger };
