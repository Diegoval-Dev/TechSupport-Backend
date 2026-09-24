import { useState, type FormEvent } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Label, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Pagination } from '../components/ui/Pagination';
import { useRegisterUser, useUsers } from '../hooks/useUsers';
import { extractErrorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types';

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  AGENTE: 'Agente',
};

const ROLE_TONE: Record<UserRole, 'purple' | 'blue' | 'slate'> = {
  ADMIN: 'purple',
  SUPERVISOR: 'blue',
  AGENTE: 'slate',
};

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useUsers(page);
  const registerUser = useRegisterUser();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.AGENTE);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEmail('');
    setPassword('');
    setRole(UserRole.AGENTE);
    setActive(true);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await registerUser.mutateAsync({ email, password, role, active });
      toast.push('Usuario creado correctamente', 'success');
      resetForm();
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">Administra las cuentas del equipo y sus roles.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nuevo usuario</Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Correo</th>
                  <th className="px-4 py-2.5">Rol</th>
                  <th className="px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{user.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={user.active ? 'green' : 'red'}>{user.active ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          resetForm();
          setModalOpen(false);
        }}
        title="Nuevo usuario"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="u-email">Correo electrónico</Label>
            <Input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="u-password">Contraseña</Label>
            <Input
              id="u-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="u-role">Rol</Label>
            <Select id="u-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {Object.values(UserRole).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-slate-300" />
            Cuenta activa
          </label>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={registerUser.isPending}>
              Crear usuario
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
