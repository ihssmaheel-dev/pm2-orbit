import type { Tag } from '@/types/pm2';

interface TagBadgeProps {
  tag: Tag;
  onClick?: () => void;
  active?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

export function TagBadge({ tag, onClick, active, removable, onRemove }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-5 px-2 text-[10px] font-semibold tracking-wide border transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${
        active
          ? 'border-current'
          : 'border-transparent opacity-80 hover:opacity-100'
      }`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: active ? tag.color : 'transparent',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-100 opacity-60 cursor-pointer"
        >
          ×
        </button>
      )}
    </span>
  );
}
