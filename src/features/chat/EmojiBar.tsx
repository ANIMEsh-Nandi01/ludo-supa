const EMOJIS = ['👍', '🎲', '😂', '🏆', '😤', '🙏', 'GG!', 'Nice!'];

interface EmojiBarProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function EmojiBar({ onSelect, disabled }: EmojiBarProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none">
      {EMOJIS.map((item) => (
        <button
          key={item}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className="shrink-0 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 px-2 py-1 text-xs font-medium text-gray-200 transition-colors disabled:opacity-50 active:scale-95 border border-white/5"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
