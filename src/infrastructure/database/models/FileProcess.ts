import mongoose from 'mongoose';

const FileProcessSchema = new mongoose.Schema(
  {
    processId: { type: String, required: true },
    total: { type: Number, required: true },
    processed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'completed',
        'completed_with_errors',
        'failed',
      ],
      default: 'pending',
    },
  },
  { timestamps: true },
);

export const FileProcess = mongoose.model(
  'FileProcess',
  FileProcessSchema,
);