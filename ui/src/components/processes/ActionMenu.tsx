import { useState } from 'react';
import { RotateCw, Play, Square, RefreshCw, Trash2, MoreHorizontal, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/shared/Dropdown';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface ActionMenuProps {
  processId: number;
  processName: string;
}

export function ActionMenu({ processId, processName }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/processes/${processId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} sent`, {
          description: processName,
        });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(`Failed to ${action}`, {
          description: data.error || 'Unknown error',
        });
      }
    } catch (err) {
      toast.error(`Failed to ${action}`, {
        description: err instanceof Error ? err.message : 'Network error',
      });
    }
    setOpen(false);
  };

  return (
    <>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        align="right"
        trigger={
          <button className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal size={16} />
          </button>
        }
      >
        <DropdownItem onClick={() => handleAction('restart')}>
          <RotateCw size={14} /> Restart
        </DropdownItem>
        <DropdownItem onClick={() => handleAction('reload')}>
          <RefreshCw size={14} /> Reload
        </DropdownItem>
        <DropdownItem onClick={() => handleAction('stop')}>
          <Square size={14} /> Stop
        </DropdownItem>
        <DropdownItem onClick={() => handleAction('start')}>
          <Play size={14} /> Start
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onClick={() => handleAction('scale')}>
          <Minus size={14} /> Scale
        </DropdownItem>
        <DropdownItem onClick={() => handleAction('flush')}>
          Flush Logs
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onClick={() => setDeleteConfirm(true)} danger>
          <Trash2 size={14} /> Delete
        </DropdownItem>
      </Dropdown>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => handleAction('delete')}
        title="Delete Process"
        message={`Are you sure you want to delete "${processName}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </>
  );
}
