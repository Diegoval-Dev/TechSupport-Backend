import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { getTicketQueue } from '../../infrastructure/queue/ticketQueue';
import { FileProcess } from '../../infrastructure/database/models/FileProcess';

export class FileProcessingService {
  async processFile(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet);

    const processId = randomUUID();

    await FileProcess.create({
      processId,
      total: rows.length,
      status: 'processing',
    });

    for (const row of rows) {
      await getTicketQueue().add('process-ticket', {
        processId,
        row,
      });
    }

    return { processId };
  }

  async getStatus(processId: string) {
    return FileProcess.findOne({ processId });
  }
}
