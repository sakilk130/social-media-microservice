import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import logger from './utils/logger';
import router from './routes/media.route';
import errorHandler from './middlewares/error-handler';
import { connectToRabbitMQ, consumeEvents } from './utils/rabbitmq';
import { handlePostDeleted } from './event-handlers/media-event-handlers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

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

app.get('/health', (req, res) =>
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Media service is healthy',
  })
);
app.use('/api/media', router);
app.use(errorHandler);

const start = async () => {
  try {
    await connectToRabbitMQ();
    await consumeEvents('post.deleted', handlePostDeleted);
    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
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
