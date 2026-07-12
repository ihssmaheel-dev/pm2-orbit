import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';
import { ProcessDetail } from '@/components/processes/ProcessDetail';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { useUIStore } from '@/store/ui';
import { useProcessStore } from '@/store/processes';

export function Dashboard() {
  const wsStatus = useUIStore((s) => s.wsStatus);
  const selectedId = useProcessStore((s) => s.selectedId);

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4 p-3 sm:p-4">
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
        <>
          {/* Desktop: side-by-side */}
          <div className="hidden lg:flex flex-1 overflow-hidden min-h-0 gap-4">
            <div className="flex-1 min-h-0 lg:min-w-0">
              <ProcessTable />
            </div>
            <div className="w-[400px] shrink-0">
              <ProcessDetail />
            </div>
          </div>

          {/* Mobile: table only, detail as overlay */}
          <div className="lg:hidden flex-1 overflow-hidden min-h-0">
            <ProcessTable />
          </div>

          {/* Mobile: detail panel as full-screen overlay */}
          {selectedId !== null && (
            <div className="lg:hidden fixed inset-0 z-40 bg-background">
              <ProcessDetail />
            </div>
          )}
        </>
      )}
    </div>
  );
}
