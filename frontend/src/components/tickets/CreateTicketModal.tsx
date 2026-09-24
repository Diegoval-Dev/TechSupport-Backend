import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Label, Select } from '../ui/Field';
import { useClients } from '../../hooks/useClients';
import { useCreateTicket } from '../../hooks/useTickets';
import { extractErrorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export function CreateTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: clients, isLoading: clientsLoading } = useClients('');
  const createTicket = useCreateTicket();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setDescription('');
    setClientId('');
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createTicket.mutateAsync({ title, description, clientId });
      toast.push('Ticket creado correctamente', 'success');
      reset();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nuevo ticket"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">Descripción</Label>
          <textarea
            id="description"
            required
            minLength={3}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-md border-0 px-3 py-1.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
          />
        </div>
        <div>
          <Label htmlFor="clientId">Cliente</Label>
          <Select id="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">{clientsLoading ? 'Cargando clientes…' : 'Selecciona un cliente'}</option>
            {clients?.data.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} · {client.company} ({client.type})
              </option>
            ))}
          </Select>
          {clients && clients.data.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              No hay clientes registrados todavía. Importa un archivo Excel para crearlos.
            </p>
          )}
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={createTicket.isPending}>
            Crear ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
}
