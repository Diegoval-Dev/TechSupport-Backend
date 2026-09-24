import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Label, Select } from '../ui/Field';
import { useAgents } from '../../hooks/useAgents';
import { useAssignAgent } from '../../hooks/useTickets';
import { extractErrorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import type { Ticket } from '../../types';

export function AssignAgentModal({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const { data: agents, isLoading } = useAgents('', true);
  const assignAgent = useAssignAgent();
  const toast = useToast();
  const [agentId, setAgentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!ticket) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const agent = agents?.data.find((a) => a.id === agentId);
    if (!agent || !ticket) return;

    try {
      await assignAgent.mutateAsync({ id: ticket.id, agentId: agent.id, agentLevel: agent.level });
      toast.push('Agente asignado correctamente', 'success');
      setAgentId('');
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <Modal open={Boolean(ticket)} onClose={onClose} title={`Asignar agente · ${ticket.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="agentId">Agente</Label>
          <Select id="agentId" required value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">{isLoading ? 'Cargando agentes…' : 'Selecciona un agente'}</option>
            {agents?.data.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · nivel {agent.level}
              </option>
            ))}
          </Select>
          {ticket.status === 'ESCALATED' && (
            <p className="mt-1 text-xs text-amber-600">
              Los tickets escalados requieren un agente de nivel 2 o superior.
            </p>
          )}
          {agents && agents.data.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No hay agentes activos disponibles.</p>
          )}
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={assignAgent.isPending} disabled={!agentId}>
            Asignar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
