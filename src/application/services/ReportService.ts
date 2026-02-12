import { TicketLog } from '../../infrastructure/database/models/TicketLog';
import { FileProcess } from '../../infrastructure/database/models/FileProcess';

export class ReportService {
  async averageResolutionByClientType() {
    return TicketLog.aggregate([
      {
        $project: {
          clientType: 1,
          resolutionMinutes: {
            $divide: [
              { $subtract: ['$resolvedAt', '$createdAt'] },
              1000 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$clientType',
          avgResolutionMinutes: { $avg: '$resolutionMinutes' },
        },
      },
    ]);
  }
  async escalatedTicketsPerMonth() {
    return TicketLog.aggregate([
      {
        $match: {
          escalationLevel: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
  }
  async topAgents() {
    return TicketLog.aggregate([
      {
        $project: {
          agentId: 1,
          resolutionMinutes: {
            $divide: [
              { $subtract: ['$resolvedAt', '$createdAt'] },
              1000 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$agentId',
          avgResolution: { $avg: '$resolutionMinutes' },
        },
      },
      { $sort: { avgResolution: 1 } },
      { $limit: 5 },
    ]);
  }
  async ticketsByStatusPerWeek() {
    return TicketLog.aggregate([
      {
        $group: {
          _id: {
            week: { $week: '$createdAt' },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.week': 1 } },
    ]);
  }
  async lastProcesses() {
    return FileProcess.find()
      .sort({ createdAt: -1 })
      .limit(10);
  }
}