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
  } catch (error) {
    logger.error('Error connecting to RabbitMQ: %o', error);
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

const consumeEvents = async (
  routingKey: string,
  callback: (data: any) => void
) => {
  if (!channel) {
    await connectToRabbitMQ();
  }
  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  channel.consume(q.queue, (msg: any) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });
  logger.info(
    'Consuming events from RabbitMQ with routing key: %s',
    routingKey
  );
};

export { connectToRabbitMQ, publishEvent, consumeEvents };
