import { Code2 } from 'lucide-react';

export default function FunctionEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-3 rounded-[8px] bg-neutral-100 dark:bg-[#333333]">
      <Code2 size={40} className="text-neutral-400 dark:text-neutral-600" />
      <div className="flex flex-col items-center justify-center gap-1">
        <p className="text-sm font-medium text-zinc-950 dark:text-white">No functions available</p>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs">
          No edge functions have been created yet
        </p>
      </div>
    </div>
  );
}
