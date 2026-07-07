import { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, Palette } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/shared/Dialog';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useTagsStore } from '@/store/tags';
import { toast } from 'sonner';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#78716c', '#14b8a6', '#a855f7',
];

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
}

export function TagManager({ open, onClose }: TagManagerProps) {
  const { tags, createTag, updateTag, deleteTag } = useTagsStore();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[4]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const tag = await createTag(newName.trim(), newColor);
    if (tag) {
      setNewName('');
      setNewColor(TAG_COLORS[4]);
      toast.success(`Tag "${tag.name}" created`);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await updateTag(id, { name: editName.trim(), color: editColor });
    setEditingId(null);
    toast.success('Tag updated');
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteTag(id);
    toast.success(`Tag "${name}" deleted`);
  };

  const ColorPicker = ({ value, onChange, onClose }: { value: string; onChange: (c: string) => void; onClose: () => void }) => (
    <div className="absolute z-50 mt-1 bg-popover border border-border/60 shadow-xl p-2 w-[164px]" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-6 gap-1.5">
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { onChange(c); onClose(); }}
            className="w-6 h-6 rounded-md border-2 cursor-pointer transition-all hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: value === c ? '#fff' : 'transparent',
              boxShadow: value === c ? `0 0 0 1px ${c}` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Manage Tags</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className="space-y-4">
          {/* Create new tag */}
          <div className="p-3 bg-subtle/20 border border-border/30 space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Create New Tag
            </label>
            <div className="flex gap-2 items-center">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tag name..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 h-8 text-xs"
              />
              <div className="relative">
                <button
                  onClick={() => setColorPickerOpen(colorPickerOpen === 'new' ? null : 'new')}
                  className="w-8 h-8 rounded border border-border/40 cursor-pointer flex items-center justify-center hover:border-border/80 transition-colors"
                  style={{ backgroundColor: `${newColor}20` }}
                >
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: newColor }} />
                </button>
                {colorPickerOpen === 'new' && (
                  <ColorPicker value={newColor} onChange={setNewColor} onClose={() => setColorPickerOpen(null)} />
                )}
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="h-8 px-3"
              >
                <Plus size={12} /> Add
              </Button>
            </div>
          </div>

          {/* Existing tags */}
          <div className="space-y-1">
            {tags.length === 0 && (
              <div className="py-8 text-center">
                <Palette size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground/50">
                  No tags yet. Create one above to get started.
                </p>
              </div>
            )}
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 py-2 px-3 border border-border/20 hover:border-border/50 transition-colors group"
              >
                {editingId === tag.id ? (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => setColorPickerOpen(colorPickerOpen === tag.id ? null : tag.id)}
                        className="w-7 h-7 rounded border border-border/40 cursor-pointer flex items-center justify-center hover:border-border/80 transition-colors shrink-0"
                        style={{ backgroundColor: `${editColor}20` }}
                      >
                        <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: editColor }} />
                      </button>
                      {colorPickerOpen === tag.id && (
                        <ColorPicker value={editColor} onChange={setEditColor} onClose={() => setColorPickerOpen(null)} />
                      )}
                    </div>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(tag.id)}
                      className="h-6 w-6 flex items-center justify-center text-success hover:bg-success/10 rounded cursor-pointer"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setColorPickerOpen(null); }}
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:bg-subtle/40 rounded cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-sm font-medium">{tag.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                        setColorPickerOpen(null);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-subtle/40 rounded cursor-pointer transition-opacity"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-opacity"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
