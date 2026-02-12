import { Worker } from 'bullmq';
import { redisConfig } from '../queue/connection';
import { TicketLog } from '../database/models/TicketLog';
import { deadLetterQueue } from '../queue/deadLetterQueue';
import { logger } from '../logger/logger';
import { FileProcess } from '../database/models/FileProcess';
import { ticketLogSchema } from '../validators/ticketLog.schema';

export const startTicketWorker = () => {
  const worker = new Worker(
    'ticket-processing',
    async (job) => {
      const { processId, row } = job.data;

      try {
        await new Promise((res) =>
          setTimeout(res, 100 + Math.random() * 400),
        );

        const parsed = ticketLogSchema.parse(row);

        await TicketLog.create({
          ticketId: parsed.ticket_id,
          clientId: parsed.client_id,
          clientType: parsed.tipo_cliente,
          createdAt: new Date(parsed.fecha_creacion),
          resolvedAt: new Date(parsed.fecha_resolucion),
          agentId: parsed.agente_id,
          escalationLevel: parsed.nivel_escalamiento,
          status: parsed.estado,
        });

        await FileProcess.updateOne(
          { processId },
          { $inc: { processed: 1 } },
        );

        return true;
      } catch (error) {
        logger.error({ error, processId }, 'Job failed');

        await FileProcess.updateOne(
          { processId },
          { $inc: { failed: 1 } },
        );

        const maxAttempts = job.opts.attempts ?? 1;

        if (job.attemptsMade + 1 >= maxAttempts) {
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
    logger.error(
      { err, jobId: job?.id },
      'Worker job failed permanently',
    );
  });

  worker.on('error', (err) => {
    logger.fatal({ err }, 'Worker crashed');
  });

  return worker;
};