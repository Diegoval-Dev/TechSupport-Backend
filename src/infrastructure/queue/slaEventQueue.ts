import { Queue } from 'bullmq';
import { redisConfig } from './connection';

let slaEventQueue: Queue | null = null;

export const getSlaEventQueue = () => {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('Queue should not be used in test environment');
  }

  if (!slaEventQueue) {
    if (!redisConfig) {
      throw new Error('Redis config missing');
    }

    slaEventQueue = new Queue('sla-events', {
      connection: redisConfig,
    });
  }

  return slaEventQueue;
};
