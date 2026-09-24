import type { ReactNode } from 'react';
import { Card } from './ui/Card';
import { Spinner } from './ui/Spinner';
import { EmptyState } from './ui/EmptyState';

export function ChartCard({
  title,
  subtitle,
  isLoading,
  isEmpty,
  children,
}: {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mb-3 text-xs text-slate-500">{subtitle}</p>}
      {isLoading ? <Spinner /> : isEmpty ? <EmptyState title="Sin datos disponibles" /> : <div className="mt-2">{children}</div>}
    </Card>
  );
}
