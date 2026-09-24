import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Button } from './ui/Button';

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Tickets', icon: '🎫' },
  { to: '/dashboard', label: 'Reportes', icon: '📊', roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
  { to: '/files', label: 'Archivos', icon: '📁', roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
  { to: '/queue', label: 'Cola', icon: '⚙️', roles: [UserRole.ADMIN] },
  { to: '/users', label: 'Usuarios', icon: '👥', roles: [UserRole.ADMIN] },
];

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  AGENTE: 'Agente',
};

export function Layout() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-xl">🛠️</span>
          <div>
            <p className="text-sm font-bold leading-none text-slate-900">TechSupport Pro</p>
            <p className="text-xs text-slate-500">Panel de soporte</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-semibold text-slate-800">{user?.email}</p>
          <p className="mb-3 text-xs text-slate-500">{user ? ROLE_LABEL[user.role] : ''}</p>
          <Button variant="secondary" className="w-full" onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
