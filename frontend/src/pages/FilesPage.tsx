import { useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useFileStatus, useUploadFile } from '../hooks/useFiles';
import { extractErrorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import type { FileProcessRow } from '../types';

const STATUS_TONE: Record<FileProcessRow['status'], 'slate' | 'blue' | 'amber' | 'green' | 'red'> = {
  pending: 'slate',
  processing: 'amber',
  completed: 'green',
  completed_with_errors: 'amber',
  failed: 'red',
};

const STATUS_LABEL: Record<FileProcessRow['status'], string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  completed_with_errors: 'Completado con errores',
  failed: 'Falló',
};

export function FilesPage() {
  const [processId, setProcessId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadFile();
  const status = useFileStatus(processId);
  const toast = useToast();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const result = await upload.mutateAsync(file);
      setProcessId(result.processId);
      toast.push('Archivo recibido, procesando en segundo plano…', 'success');
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const progress = status.data && status.data.total > 0 ? Math.round((status.data.processed / status.data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Archivos</h1>
        <p className="text-sm text-slate-500">Importa tickets históricos desde un archivo Excel.</p>
      </div>

      <Card className="p-6">
        <label
          htmlFor="file-upload"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-brand-400 hover:bg-brand-50"
        >
          <span className="text-3xl">📄</span>
          <span className="text-sm font-medium text-slate-700">
            {upload.isPending ? 'Subiendo…' : 'Haz clic para seleccionar un archivo .xlsx'}
          </span>
          <span className="text-xs text-slate-500">Tamaño máximo 20 MB</span>
          <input
            id="file-upload"
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={upload.isPending}
            onChange={(e) => void handleFileChange(e)}
          />
        </label>
      </Card>

      {processId && (
        <Card className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{fileName}</p>
              <p className="font-mono text-xs text-slate-500">{processId}</p>
            </div>
            {status.data && <Badge tone={STATUS_TONE[status.data.status]}>{STATUS_LABEL[status.data.status]}</Badge>}
          </div>

          {status.isLoading ? (
            <p className="text-sm text-slate-500">Consultando estado…</p>
          ) : status.data ? (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  {status.data.processed} / {status.data.total} procesados
                </span>
                <span>{status.data.failed} fallidos</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No se encontró información del proceso.</p>
          )}

          <Button variant="ghost" className="mt-4" onClick={() => setProcessId(null)}>
            Importar otro archivo
          </Button>
        </Card>
      )}
    </div>
  );
}
