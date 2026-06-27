import { SystemCards } from '@/components/system/SystemCards';
import { ProcessTable } from '@/components/processes/ProcessTable';
import { ProcessDetail } from '@/components/processes/ProcessDetail';
import { useProcessStore } from '@/store/processes';

export function Dashboard() {
  const selectedId = useProcessStore((s) => s.selectedId);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <SystemCards />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className={selectedId !== null ? 'w-[35%]' : 'w-full'}>
          <ProcessTable />
        </div>
        {selectedId !== null && <ProcessDetail />}
      </div>
    </div>
  );
}
