import { useState } from 'react';
import { RotateCw, Play, Square, RefreshCw, Trash2, MoreHorizontal, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/shared/Dropdown';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/shared/Dialog';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useProcessStore } from '@/store/processes';
import type { ProcessStatus } from '@/types/pm2';

interface ActionMenuProps {
  processId: number;
  processName: string;
}

const STATUS_ACTIONS: Record<ProcessStatus, string[]> = {
  online: ['restart', 'reload', 'stop'],
  stopped: ['start'],
  errored: ['restart'],
  launching: [],
  stopping: [],
};

export function ActionMenu({ processId, processName }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleValue, setScaleValue] = useState('+1');
  const process = useProcessStore((s) => s.processes.get(processId));
  const status = process?.status || 'stopped';
  const mode = process?.mode || 'fork';

  const handleAction = async (action: string, instances?: string) => {
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'scale' && instances) {
        body.instances = instances;
      }
      const res = await fetch(`/api/processes/${processId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    setConfirmAction(null);
  };

  const actions = STATUS_ACTIONS[status] || [];

  if (actions.length === 0) return null;

  const destructiveActions = ['stop'];

  return (
    <>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        align="right"
        trigger={
          <button
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Actions for ${processName}`}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
        }
      >
        {actions.includes('start') && (
          <DropdownItem onClick={() => { setConfirmAction('start'); }}>
            <Play size={14} /> Start
          </DropdownItem>
        )}
        {actions.includes('restart') && (
          <DropdownItem onClick={() => { setConfirmAction('restart'); }}>
            <RotateCw size={14} /> Restart
          </DropdownItem>
        )}
        {actions.includes('reload') && (
          <DropdownItem onClick={() => { setConfirmAction('reload'); }}>
            <RefreshCw size={14} /> Reload
          </DropdownItem>
        )}
        {actions.includes('stop') && (
          <DropdownItem onClick={() => { setConfirmAction('stop'); }}>
            <Square size={14} /> Stop
          </DropdownItem>
        )}

        {actions.length > 0 && <DropdownSeparator />}

        <DropdownItem onClick={() => { setScaleOpen(true); }}>
          Scale
        </DropdownItem>
        <DropdownItem onClick={() => { setConfirmAction('flush'); }}>
          Flush Logs
        </DropdownItem>

        <DropdownSeparator />
        <DropdownItem onClick={() => setDeleteConfirm(true)} danger>
          <Trash2 size={14} /> Delete
        </DropdownItem>
      </Dropdown>

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleAction(confirmAction)}
        title={`${confirmAction ? confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1) : ''} Process`}
        message={`Are you sure you want to ${confirmAction} "${processName}"?`}
        confirmLabel={confirmAction ? confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1) : ''}
        variant={confirmAction && destructiveActions.includes(confirmAction) ? 'destructive' : 'default'}
      />
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => handleAction('delete')}
        title="Delete Process"
        message={`Are you sure you want to delete "${processName}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      <Dialog open={scaleOpen} onClose={() => setScaleOpen(false)}>
        <DialogHeader>
          <DialogTitle>Scale Process</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current instances: <span className="text-foreground font-mono">{process?.instances || 1}</span>
            </p>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Scale To</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const num = parseInt(scaleValue) || 1;
                    setScaleValue(String(Math.max(1, num - 1)));
                  }}
                  className="h-10 w-10 flex items-center justify-center border border-border hover:bg-muted cursor-pointer"
                >
                  <Minus size={14} />
                </button>
                <Input
                  type="text"
                  value={scaleValue}
                  onChange={(e) => setScaleValue(e.target.value)}
                  placeholder="+1 or number"
                  className="h-10 text-center font-mono"
                />
                <button
                  onClick={() => {
                    const num = parseInt(scaleValue) || 1;
                    setScaleValue(String(num + 1));
                  }}
                  className="h-10 w-10 flex items-center justify-center border border-border hover:bg-muted cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Use "+1" to add one instance, "-1" to remove one, or a specific number</p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setScaleOpen(false)}>Cancel</Button>
          <Button onClick={async () => {
            await handleAction('scale', scaleValue);
            setScaleOpen(false);
          }}>Scale</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
