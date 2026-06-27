import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';
import { ProcessDetail } from '@/components/processes/ProcessDetail';

export function Dashboard() {
  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <SystemCards />
      <div className="flex-1 flex overflow-hidden min-h-0 gap-4">
        <div className="flex-1 min-w-0">
          <ProcessTable />
        </div>
        <ProcessDetail />
      </div>
    </div>
  );
}
