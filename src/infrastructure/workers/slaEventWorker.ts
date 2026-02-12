import { Worker } from 'bullmq';
import { redisConfig } from '../queue/connection';
import { logger } from '../logger/logger';
import { getSlaEventQueue } from '../queue/slaEventQueue';

interface SLAEvent {
  ticketId: string;
  clientType: string;
  escalated: boolean;
  needsSupervisorNotif: boolean;
  slaHoursElapsed: number;
}

export const startSlaEventWorker = () => {
  if (!redisConfig) {
    throw new Error('Redis configuration is not available');
  }

  const worker = new Worker(
    'sla-events',
    async (job) => {
      const event: SLAEvent = job.data;

      try {
        if (event.escalated) {
          logger.info({
            type: 'SLA_ESCALATED',
            ticketId: event.ticketId,
            clientType: event.clientType,
            slaHoursElapsed: event.slaHoursElapsed,
          }, 'SLA escalation event');
        }

        if (event.needsSupervisorNotif) {

          logger.warn({
            type: 'SLA_BREACH_NOTIFICATION',
            ticketId: event.ticketId,
            clientType: event.clientType,
            slaHoursElapsed: event.slaHoursElapsed,
            message: 'Supervisor notification: SLA breached for NORMAL client',
          }, 'SLA breach notification');
        }

        return { processed: true };
      } catch (error) {
        logger.error({ error, event }, 'SLA event processing failed');
        throw error;
      }
    },
    {
      connection: redisConfig,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'SLA event processed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'SLA event worker job failed');
  });

  worker.on('error', (err) => {
    logger.fatal({ err }, 'SLA event worker crashed');
  });

  return worker;
};
