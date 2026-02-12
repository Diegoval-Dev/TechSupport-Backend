import 'dotenv/config';

import { app } from './app';
import { env } from './config/env';
import { connectMongo } from './infrastructure/database/mongo';
import { startTicketWorker } from './infrastructure/workers/ticketProcessor.worker';
import { startSlaScheduler } from './infrastructure/workers/slaScheduler';
import { startSlaEventWorker } from './infrastructure/workers/slaEventWorker';
import { prisma } from './infrastructure/database/prisma';
import bcrypt from 'bcrypt';

const ensureAdminUser = async () => {
  const adminEmail = 'admin@techsupport.pro';

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Created default admin user');
};

(async () => {
  if (process.env.NODE_ENV !== 'test') {
    await connectMongo();
    await ensureAdminUser();
    startTicketWorker();
    startSlaEventWorker();
    startSlaScheduler();
  }

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
})();
