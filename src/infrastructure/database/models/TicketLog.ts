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

TicketLogSchema.index({ createdAt: 1 });
TicketLogSchema.index({ clientType: 1 });
TicketLogSchema.index({ agentId: 1 });
TicketLogSchema.index({ escalationLevel: 1 });

export const TicketLog = mongoose.model('TicketLog', TicketLogSchema);
