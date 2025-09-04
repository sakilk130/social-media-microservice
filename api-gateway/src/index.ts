import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore, SendCommandFn } from 'rate-limit-redis';
import proxy from 'express-http-proxy';
import logger from './utils/logger';
import errorHandler from './middleware/error-handler';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const redisClient = new Redis(process.env.REDIS_URL as string);
redisClient.on('error', (err) => console.error('Redis Client Error', err));

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) =>
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API Gateway is healthy',
  })
);

const rateLimitOptions = rateLimit({
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

app.use(rateLimitOptions);
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${JSON.stringify(req.body)}`);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req: Request) => {
    return req.originalUrl.replace(/^\/v1/, '/api');
  },
  proxyErrorHandler: (err: any, res: Response, next: NextFunction) => {
    logger.error('Proxy error: %o', err);
    res
      .status(500)
      .json({ success: false, message: 'Proxy error', error: err.message });
  },
};

app.use(
  '/v1/auth',
  proxy(process.env.IDENTITY_SERVICE as string, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['Content-Type'] = 'application/json';
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(
    `Identity service is running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(`Redis Url ${process.env.REDIS_URL}`);
});
