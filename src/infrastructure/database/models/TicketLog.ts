import mongoose from 'mongoose';

const TicketLogSchema = new mongoose.Schema(
  {
    ticketId: String,
    clientId: String,
    clientType: String,
    createdAt: Date,
    resolvedAt: Date,
    agentId: String,
    escalationLevel: Number,
    status: String,
  },
  { timestamps: true },
);

export const TicketLog = mongoose.model('TicketLog', TicketLogSchema);