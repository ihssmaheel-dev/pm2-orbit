import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';

export function Dashboard() {
  return (
    <div className="flex flex-col h-full">
      <SystemCards />
      <div className="flex-1 overflow-hidden">
        <ProcessTable />
      </div>
    </div>
  );
}
