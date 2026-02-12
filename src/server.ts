import { app } from './app';
import { env } from './config/env';
import { connectMongo } from './infrastructure/database/mongo';
import { startTicketWorker } from './infrastructure/workers/ticketProcessor.worker';


(async () => {
    if(process.env.NODE_ENV !== 'test') {
        await connectMongo();
        startTicketWorker();
    }

    app.listen(env.port, () => {
        console.log(`Server running on port ${env.port}`);
    });
})();