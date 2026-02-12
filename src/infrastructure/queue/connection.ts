import { RedisOptions } from 'bullmq';

export const redisConfig: RedisOptions | null =
  process.env.NODE_ENV === 'test'
    ? null
    : {
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT) || 6379,
      };
