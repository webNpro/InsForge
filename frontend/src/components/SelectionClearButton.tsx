import { X } from 'lucide-react';

interface SelectionClearButtonProps {
  selectedCount: number;
  itemType: string;
  onClear: () => void;
}

export function SelectionClearButton({
  selectedCount,
  itemType,
  onClear,
}: SelectionClearButtonProps) {
  const isPlural = selectedCount > 1;
  const displayText = `${selectedCount} ${isPlural ? `${itemType}s` : itemType} selected`;

  return (
    <button
      className="flex items-center gap-1.5 h-10 px-3 rounded-[6px] bg-white border border-border-gray hover:bg-gray-50 dark:bg-neutral-600 dark:border-neutral-600 dark:hover:bg-neutral-700 transition-colors"
      onClick={onClear}
    >
      <p className="text-zinc-950 dark:text-white text-sm">{displayText}</p>
      <X className="h-4 w-4 text-gray-500 dark:text-neutral-400" />
    </button>
  );
}
