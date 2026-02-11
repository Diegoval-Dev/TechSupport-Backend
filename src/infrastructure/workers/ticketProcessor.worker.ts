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
      const { processId, row } = job.data;

      try {
        await new Promise((res) =>
          setTimeout(res, 100 + Math.random() * 400),
        );

        await TicketLog.create(row);

        await FileProcess.updateOne(
          { processId },
          { $inc: { processed: 1 } },
        );

        return true;
      } catch (error) {
        logger.error({ error }, 'Job failed');

        await FileProcess.updateOne(
          { processId },
          { $inc: { failed: 1 } },
        );

        // DLQ después del último intento (3 intentos totales)
        if (job.attemptsMade + 1 >= job.opts.attempts!) {
          await deadLetterQueue.add('failed-ticket', job.data);
        }

        throw error;
      }
    },
    {
      connection: redisConfig,
      concurrency: 10,
    },
  );

  worker.on('completed', async (job) => {
    const process = await FileProcess.findOne({
      processId: job.data.processId,
    });

    if (!process) return;

    if (process.processed + process.failed >= process.total) {
      process.status =
        process.failed > 0
          ? 'completed_with_errors'
          : 'completed';

      await process.save();
    }
  });

  worker.on('failed', async (job, err) => {
    logger.error({ err }, 'Worker job failed permanently');
  });

  return worker;
};