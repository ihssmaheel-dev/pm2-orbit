import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';
import { ProcessDetail } from '@/components/processes/ProcessDetail';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { useProcessStore } from '@/store/processes';

export function Dashboard() {
  const processCount = useProcessStore((s) => s.processes.size);
  const loading = processCount === 0;

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <SystemCards />
      {loading ? (
        <div className="flex-1 bg-card border border-border/50 overflow-hidden">
          <TableSkeleton rows={10} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 gap-4">
          <div className="flex-1 min-h-0 lg:min-w-0">
            <ProcessTable />
          </div>
          <div className="max-lg:h-80 max-lg:shrink-0 lg:w-[420px] lg:shrink-0">
            <ProcessDetail />
          </div>
        </div>
      )}
    </div>
  );
}
