import { useParams } from 'react-router-dom';
import { LogViewer } from '@/components/logs/LogViewer';

export function Logs() {
  const { id } = useParams<{ id?: string }>();
  const processId = id ? parseInt(id, 10) : undefined;
  return (
    <div className="h-full">
      <LogViewer {...(processId != null ? { initialProcessId: processId } : {})} />
    </div>
  );
}
