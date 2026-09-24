import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Label, Select } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { TicketStatusBadge, availableStatusActions } from '../components/tickets/TicketStatusBadge';
import { CreateTicketModal } from '../components/tickets/CreateTicketModal';
import { AssignAgentModal } from '../components/tickets/AssignAgentModal';
import { useClients } from '../hooks/useClients';
import { useAgents } from '../hooks/useAgents';
import { useDeleteTicket, useTickets, useUpdateTicketStatus, type TicketFiltersInput } from '../hooks/useTickets';
import { TicketStatus, type Ticket } from '../types';
import { extractErrorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';

const PAGE_SIZE = 10;

export function TicketsPage() {
  const [filters, setFilters] = useState<Omit<TicketFiltersInput, 'page' | 'pageSize'>>({});
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null);

  const { data: clients } = useClients('');
  const { data: agents } = useAgents();
  const { data, isLoading, isFetching } = useTickets({ ...filters, page, pageSize: PAGE_SIZE });
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteTicket();
  const toast = useToast();

  const clientMap = useMemo(() => new Map(clients?.data.map((c) => [c.id, c])), [clients]);
  const agentMap = useMemo(() => new Map(agents?.data.map((a) => [a.id, a])), [agents]);

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  async function handleStatusChange(ticket: Ticket, status: TicketStatus) {
    try {
      await updateStatus.mutateAsync({ id: ticket.id, status });
      toast.push('Estado actualizado', 'success');
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error');
    }
  }

  async function handleDelete(ticket: Ticket) {
    if (!window.confirm(`¿Eliminar el ticket "${ticket.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteTicket.mutateAsync(ticket.id);
      toast.push('Ticket eliminado', 'success');
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500">Gestiona las solicitudes de soporte y su ciclo de vida.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Nuevo ticket</Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <Label htmlFor="f-status">Estado</Label>
            <Select
              id="f-status"
              value={filters.status ?? ''}
              onChange={(e) => updateFilter('status', (e.target.value || undefined) as TicketStatus | undefined)}
            >
              <option value="">Todos</option>
              {Object.values(TicketStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="f-priority">Prioridad</Label>
            <Input
              id="f-priority"
              type="number"
              min={1}
              value={filters.priority ?? ''}
              onChange={(e) => updateFilter('priority', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="f-client">Cliente</Label>
            <Select
              id="f-client"
              value={filters.clientId ?? ''}
              onChange={(e) => updateFilter('clientId', e.target.value || undefined)}
            >
              <option value="">Todos</option>
              {clients?.data.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="f-from">Desde</Label>
            <Input
              id="f-from"
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => updateFilter('from', e.target.value || undefined)}
            />
          </div>
          <div>
            <Label htmlFor="f-to">Hasta</Label>
            <Input
              id="f-to"
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => updateFilter('to', e.target.value || undefined)}
            />
          </div>
        </div>
        {Object.keys(filters).length > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="No hay tickets" description="Crea un ticket nuevo o ajusta los filtros." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Agente</th>
                  <th className="px-4 py-3">Escalación</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((ticket) => {
                  const client = clientMap.get(ticket.clientId);
                  const agent = ticket.agentId ? agentMap.get(ticket.agentId) : null;
                  const actions = availableStatusActions(ticket.status);
                  const locked = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50">
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate font-medium text-slate-900">{ticket.title}</p>
                        <p className="truncate text-xs text-slate-500">{ticket.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {client ? client.name : <span className="text-xs text-slate-400">{ticket.clientId.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-4 py-3">
                        <TicketStatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ticket.priority}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {agent ? agent.name : <span className="text-xs text-slate-400">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ticket.escalationLevel}</td>
                      <td className="px-4 py-3 text-slate-500">{format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {actions.map((action) => (
                            <Button
                              key={action.status}
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              loading={updateStatus.isPending}
                              onClick={() => void handleStatusChange(ticket, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                          {!locked && (
                            <Button
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              onClick={() => setAssignTarget(ticket)}
                            >
                              Asignar
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            className="px-2 py-1 text-xs"
                            loading={deleteTicket.isPending}
                            onClick={() => void handleDelete(ticket)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        )}
        {isFetching && !isLoading && <p className="px-4 py-2 text-xs text-slate-400">Actualizando…</p>}
      </Card>

      <CreateTicketModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AssignAgentModal ticket={assignTarget} onClose={() => setAssignTarget(null)} />
    </div>
  );
}
