import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="text-xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="text-sm text-slate-500">La ruta que buscas no existe o no tienes acceso a ella.</p>
      <Link to="/">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
