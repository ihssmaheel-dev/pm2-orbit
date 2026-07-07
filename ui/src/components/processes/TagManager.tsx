import { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/shared/Dialog';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useTagsStore } from '@/store/tags';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
}

export function TagManager({ open, onClose }: TagManagerProps) {
  const { tags, createTag, updateTag, deleteTag } = useTagsStore();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTag(newName.trim(), newColor);
    setNewName('');
    setNewColor(TAG_COLORS[0]);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await updateTag(id, { name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTag(id);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Manage Tags</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className="space-y-4">
          {/* Create new tag */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                New Tag
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. production"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex gap-1 pb-0.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: newColor === c ? '#fff' : 'transparent',
                  }}
                />
              ))}
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim()} className="h-10">
              <Plus size={14} />
            </Button>
          </div>

          {/* Existing tags */}
          <div className="space-y-1">
            {tags.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No tags yet. Create one above.
              </p>
            )}
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 py-2 px-2 border border-border/30 hover:border-border/60 transition-colors"
              >
                {editingId === tag.id ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: editColor }}
                    />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                      autoFocus
                    />
                    <div className="flex gap-0.5">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className="w-3.5 h-3.5 rounded-full border cursor-pointer"
                          style={{
                            backgroundColor: c,
                            borderColor: editColor === c ? '#fff' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleUpdate(tag.id)}
                      className="text-success hover:text-success/80 cursor-pointer"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-sm font-medium">{tag.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                      }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 size={12} />
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
