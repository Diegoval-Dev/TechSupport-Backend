import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import fs from 'fs';

const TOTAL = 5000;

const rows = [];

for (let i = 0; i < TOTAL; i++) {
  rows.push({
    ticket_id: randomUUID(),
    client_id: randomUUID(),
    tipo_cliente: Math.random() > 0.5 ? 'VIP' : 'NORMAL',
    fecha_creacion: new Date().toISOString(),
    fecha_resolucion: new Date(
      Date.now() + Math.random() * 10000000,
    ).toISOString(),
    agente_id: randomUUID(),
    nivel_escalamiento: Math.floor(Math.random() * 3),
    estado: 'RESOLVED',
  });
}

const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');

XLSX.writeFile(workbook, 'tickets_5000.xlsx');

console.log('Excel file generated: tickets_5000.xlsx');