import mongoose from 'mongoose';

export const connectMongo = async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://mongo:27017/techsupport',
  );
};