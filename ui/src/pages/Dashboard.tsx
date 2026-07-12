import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';
import { ProcessDetail } from '@/components/processes/ProcessDetail';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { useUIStore } from '@/store/ui';

export function Dashboard() {
  const wsStatus = useUIStore((s) => s.wsStatus);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {wsStatus === 'disconnected' && (
        <div className="h-8 flex items-center justify-center bg-destructive/10 border border-destructive/30 text-destructive text-xs uppercase tracking-wider">
          Disconnected — showing stale data
        </div>
      )}
      <SystemCards />
      {wsStatus === 'connecting' ? (
        <div className="flex-1 bg-card border border-border/50 overflow-hidden">
          <TableSkeleton rows={10} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 gap-4">
          <div className="flex-1 min-h-0 lg:min-w-0">
            <ProcessTable />
          </div>
          <div className="h-80 lg:h-full lg:w-[400px] lg:shrink-0">
            <ProcessDetail />
          </div>
        </div>
      )}
    </div>
  );
}
