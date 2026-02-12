import { Queue } from 'bullmq';
import { redisConfig } from './connection';

export const deadLetterQueue = new Queue('ticket-dlq', {
  connection: redisConfig!,
});
