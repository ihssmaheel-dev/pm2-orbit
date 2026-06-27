import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';
import { ProcessDetail } from '@/components/processes/ProcessDetail';
import { useProcessStore } from '@/store/processes';

export function Dashboard() {
  const selectedId = useProcessStore((s) => s.selectedId);

  return (
    <div className="flex flex-col h-full">
      <SystemCards />
      <div className="flex-1 flex overflow-hidden">
        <div className={selectedId !== null ? 'w-[35%] border-r border-border' : 'w-full'}>
          <ProcessTable />
        </div>
        {selectedId !== null && <ProcessDetail />}
      </div>
    </div>
  );
}
