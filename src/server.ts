import 'dotenv/config';

import { app } from './app';
import { env } from './config/env';
import { connectMongo } from './infrastructure/database/mongo';
import { startTicketWorker } from './infrastructure/workers/ticketProcessor.worker';
import { startSlaScheduler } from './infrastructure/workers/slaScheduler';

(async () => {
  if (process.env.NODE_ENV !== 'test') {
    await connectMongo();
    startTicketWorker();
    startSlaScheduler();
  }

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
})();
