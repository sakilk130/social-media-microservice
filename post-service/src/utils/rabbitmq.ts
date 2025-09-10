import amqp from 'amqplib';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

let connection = null;
let channel: any = null;

const EXCHANGE_NAME = 'posts_exchange';

const connectToRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL as string);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    logger.info('Connected to RabbitMQ');
    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ: %o', error);
  }
};

const publishEvent = async (routingKey: string, message: any) => {
  if (!channel) {
    await connectToRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info('Published event to RabbitMQ: %s', routingKey);
};

export { connectToRabbitMQ, publishEvent };
