import { Worker } from 'bullmq';
import { redisConfig } from '../queue/connection';
import { TicketLog } from '../database/models/TicketLog';
import { deadLetterQueue } from '../queue/deadLetterQueue';
import { logger } from '../logger/logger';
import { FileProcess } from '../database/models/FileProcess';

export const startTicketWorker = () => {
  const worker = new Worker(
    'ticket-processing',
    async (job) => {
      const data = job.data;

      try {
        await new Promise((res) =>
          setTimeout(res, 100 + Math.random() * 400),
        );

        await TicketLog.create(data.row);

        await FileProcess.updateOne(
          { processId: data.processId },
          { $inc: { processed: 1 } },
        );

        return true;
      } catch (error) {
        logger.error({ error }, 'Job failed');

        await FileProcess.updateOne(
          { processId: data.processId },
          { $inc: { failed: 1 } },
        );

        if (job.attemptsMade >= 2) {
          await deadLetterQueue.add('failed-ticket', data);
        }

        throw error;
      }
    },
    {
      connection: redisConfig,
      concurrency: 10,
    },
  );

  return worker;
};