import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { Card } from '../components/ui/Card';
import { useReport } from '../hooks/useReports';
import { useAgents } from '../hooks/useAgents';
import { AXIS_STYLE, CATEGORICAL, GRID_STROKE, SEQUENTIAL_BLUE } from '../lib/palette';
import { TicketStatus } from '../types';
import type { AvgResolutionRow, EscalatedPerMonthRow, FileProcessRow, TopAgentRow, WeeklyStatusRow } from '../types';

const CLIENT_TYPE_LABEL: Record<string, string> = { VIP: 'VIP', NORMAL: 'Normal' };

const STATUS_COLOR: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: CATEGORICAL[0],
  [TicketStatus.IN_PROGRESS]: CATEGORICAL[1],
  [TicketStatus.RESOLVED]: CATEGORICAL[2],
  [TicketStatus.CLOSED]: CATEGORICAL[3],
  [TicketStatus.ESCALATED]: CATEGORICAL[4],
};

const PROCESS_STATUS_LABEL: Record<FileProcessRow['status'], string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  completed_with_errors: 'Con errores',
  failed: 'Falló',
};

export function DashboardPage() {
  const avgResolution = useReport<AvgResolutionRow[]>('avg-resolution');
  const escalatedPerMonth = useReport<EscalatedPerMonthRow[]>('escalated-per-month');
  const topAgents = useReport<TopAgentRow[]>('top-agents');
  const weeklyStatus = useReport<WeeklyStatusRow[]>('weekly-status');
  const lastProcesses = useReport<FileProcessRow[]>('last-processes');
  const { data: agents } = useAgents();

  const agentMap = useMemo(() => new Map(agents?.data.map((a) => [a.id, a.name])), [agents]);

  const avgResolutionData = useMemo(
    () =>
      (avgResolution.data ?? []).map((row) => ({
        label: row._id ? CLIENT_TYPE_LABEL[row._id] ?? row._id : 'Sin tipo',
        minutos: row.avgResolutionMinutes ? Math.round(row.avgResolutionMinutes) : 0,
      })),
    [avgResolution.data],
  );

  const escalatedData = useMemo(
    () =>
      (escalatedPerMonth.data ?? [])
        .slice()
        .sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month)
        .map((row) => ({
          label: `${String(row._id.month).padStart(2, '0')}/${row._id.year}`,
          tickets: row.count,
        })),
    [escalatedPerMonth.data],
  );

  const topAgentsData = useMemo(
    () =>
      (topAgents.data ?? []).map((row) => ({
        label: row._id ? agentMap.get(row._id) ?? `${row._id.slice(0, 8)}…` : 'Sin asignar',
        minutos: row.avgResolution ? Math.round(row.avgResolution) : 0,
      })),
    [topAgents.data, agentMap],
  );

  const weeklyStatusData = useMemo(() => {
    const weeks = new Map<number, Record<string, number | string>>();
    for (const row of weeklyStatus.data ?? []) {
      const week = row._id.week;
      const entry = weeks.get(week) ?? { label: `Sem. ${week}` };
      entry[row._id.status] = row.count;
      weeks.set(week, entry);
    }
    return Array.from(weeks.values()).sort((a, b) => Number(a.label.toString().slice(5)) - Number(b.label.toString().slice(5)));
  }, [weeklyStatus.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500">Métricas operativas del equipo de soporte.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Tiempo promedio de resolución por tipo de cliente"
          subtitle="Minutos promedio desde creación hasta resolución"
          isLoading={avgResolution.isLoading}
          isEmpty={avgResolutionData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={avgResolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="minutos" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} barSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Tickets escalados por mes"
          isLoading={escalatedPerMonth.isLoading}
          isEmpty={escalatedData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={escalatedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="tickets" stroke={CATEGORICAL[7]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top 5 agentes por tiempo de resolución"
          subtitle="Menor es mejor (minutos promedio)"
          isLoading={topAgents.isLoading}
          isEmpty={topAgentsData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topAgentsData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={110} />
              <Tooltip />
              <Bar dataKey="minutos" fill={SEQUENTIAL_BLUE} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Tickets por estado y semana"
          isLoading={weeklyStatus.isLoading}
          isEmpty={weeklyStatusData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.values(TicketStatus).map((status) => (
                <Bar key={status} dataKey={status} stackId="status" fill={STATUS_COLOR[status]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Últimos procesos de importación</h2>
          <p className="text-xs text-slate-500">Archivos Excel procesados recientemente</p>
        </div>
        {lastProcesses.isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Cargando…</p>
        ) : !lastProcesses.data || lastProcesses.data.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no se han procesado archivos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Proceso</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Procesados</th>
                  <th className="px-4 py-2.5">Fallidos</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lastProcesses.data.map((process) => (
                  <tr key={process._id}>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{process.processId.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5">{process.total}</td>
                    <td className="px-4 py-2.5">{process.processed}</td>
                    <td className="px-4 py-2.5">{process.failed}</td>
                    <td className="px-4 py-2.5">{PROCESS_STATUS_LABEL[process.status]}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(process.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
