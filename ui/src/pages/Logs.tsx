import { useParams } from 'react-router-dom';
import { LogViewer } from '@/components/logs/LogViewer';

export function Logs() {
  const { processName } = useParams<{ processName?: string }>();
  return (
    <div className="h-full">
      <LogViewer {...(processName ? { initialProcessName: processName } : {})} />
    </div>
  );
}
