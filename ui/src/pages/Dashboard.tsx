import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';
import { ProcessDetail } from '@/components/processes/ProcessDetail';

export function Dashboard() {
  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <SystemCards />
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 gap-4">
        <div className="flex-1 min-h-0 lg:min-w-0">
          <ProcessTable />
        </div>
        <div className="max-lg:h-80 max-lg:shrink-0 lg:w-[420px] lg:shrink-0">
          <ProcessDetail />
        </div>
      </div>
    </div>
  );
}
