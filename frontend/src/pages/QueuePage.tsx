import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useDeadLetters, useQueueStats } from '../hooks/useQueue';

const STAT_CONFIG = [
  { key: 'waiting', label: 'En espera', color: 'text-slate-700' },
  { key: 'active', label: 'Activos', color: 'text-amber-600' },
  { key: 'completed', label: 'Completados', color: 'text-emerald-600' },
  { key: 'failed', label: 'Fallidos', color: 'text-red-600' },
  { key: 'deadLetter', label: 'Dead letter', color: 'text-purple-600' },
] as const;

export function QueuePage() {
  const stats = useQueueStats();
  const dlq = useDeadLetters();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cola de procesamiento</h1>
        <p className="text-sm text-slate-500">Estado de la cola de importación de tickets (BullMQ + Redis).</p>
      </div>

      {stats.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STAT_CONFIG.map((stat) => (
            <Card key={stat.key} className="p-5 text-center">
              <p className={`text-3xl font-bold ${stat.color}`}>{stats.data?.[stat.key] ?? 0}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Dead-letter queue</h2>
          <p className="text-xs text-slate-500">Trabajos que agotaron sus reintentos.</p>
        </div>
        {dlq.isLoading ? (
          <Spinner />
        ) : !dlq.data || dlq.data.length === 0 ? (
          <EmptyState title="Sin trabajos en DLQ" description="Todo se está procesando correctamente." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Job ID</th>
                  <th className="px-4 py-2.5">Intentos</th>
                  <th className="px-4 py-2.5">Datos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dlq.data.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{job.id}</td>
                    <td className="px-4 py-2.5">{job.attempts}</td>
                    <td className="max-w-md truncate px-4 py-2.5 font-mono text-xs text-slate-500">
                      {JSON.stringify(job.data)}
                    </td>
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
