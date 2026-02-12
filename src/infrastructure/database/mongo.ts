import mongoose from 'mongoose';
import { TicketLog } from './models/TicketLog';
import { FileProcess } from './models/FileProcess';

export const connectMongo = async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://mongo:27017/techsupport',
  );

  await TicketLog.syncIndexes();
  await FileProcess.syncIndexes();

  console.log('Mongo connected and indexes synced');
};