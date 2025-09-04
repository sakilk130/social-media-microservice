import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import logger from './utils/logger';
import rateLimit from 'express-rate-limit';
import RedisStore, { SendCommandFn } from 'rate-limit-redis';
import router from './routes/identity-service.route';
import errorHandler from './middlewares/error-handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
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

const sensitiveRoutesRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip || 'unknown'}`);
    res.status(429).json({ success: false, message: 'Too many requests' });
  },
  store: new RedisStore({
    sendCommand: (async (
      ...args: string[]
    ): Promise<string | number | Buffer | any[] | null> => {
      return redisClient.call(args[0], ...args.slice(1)) as Promise<
        string | number | Buffer | any[] | null
      >;
    }) as SendCommandFn,
  }),
});

app.use('/health', (req, res) =>
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Identity service is healthy',
  })
);

app.use('/api/auth/register', sensitiveRoutesRateLimiter);
app.use('/api/auth', router);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});
