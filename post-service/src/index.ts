import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import logger from './utils/logger';
import router from './routes/post.route';
import errorHandler from './middlewares/error-handler';
import { connectToRabbitMQ } from './utils/rabbitmq';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const redisClient = new Redis(process.env.REDIS_URL as string);

redisClient.on('error', (err) => console.error('Redis Client Error', err));

mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => logger.info('Connected to mongodb'))
  .catch((e) => logger.error('Mongo connection error', e));

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 5, // 5 requests per 1 second by IP
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip || 'unknown')
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip || 'unknown'}`);
      res.status(429).json({ success: false, message: 'Too many requests' });
    });
});

app.get('/health', (req, res) =>
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Post service is healthy',
  })
);

app.use(
  '/api/posts',
  (req: any, res: Response, next: NextFunction) => {
    req.redisClient = redisClient;
    next();
  },
  router
);

app.use(errorHandler);

const start = async () => {
  try {
    await connectToRabbitMQ();
    app.listen(PORT, () => {
      logger.info(`Post service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server: %o', error);
    process.exit(1);
  }
};

start();

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});
