import { cn } from '@/lib/utils/utils';

interface LogsSidebarProps {
  sources: string[];
  selectedSource: string | null;
  onSourceSelect: (source: string) => void;
  loading?: boolean;
}

export function LogsSidebar({
  sources,
  selectedSource,
  onSourceSelect,
  loading,
}: LogsSidebarProps) {
  return (
    <div className="w-60 px-3 py-4 flex flex-col h-full bg-white dark:bg-neutral-800 border-r border-border-gray dark:border-neutral-700">
      <div className="mb-4 w-full">
        <p className="text-base text-zinc-950 dark:text-neutral-400">Logs</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-full rounded bg-zinc-100 dark:bg-neutral-700 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => onSourceSelect('MCP')}
              className={cn(
                'h-9 w-full flex items-center justify-between pl-3 py-1 pr-1 rounded text-left transition-colors',
                selectedSource === 'MCP'
                  ? 'bg-zinc-100 dark:bg-neutral-700 text-zinc-950 dark:text-white'
                  : 'hover:bg-zinc-50 dark:hover:bg-neutral-700/50 text-zinc-700 dark:text-zinc-300'
              )}
            >
              <p className="text-sm text-zinc-950 dark:text-white">MCP logs</p>
            </button>
            {sources.map((source) => {
              const isSelected = selectedSource === source;

              return (
                <button
                  key={source}
                  onClick={() => onSourceSelect(source)}
                  className={cn(
                    'h-9 w-full flex items-center justify-between pl-3 py-1 pr-1 rounded text-left transition-colors',
                    isSelected
                      ? 'bg-zinc-100 dark:bg-neutral-700 text-zinc-950 dark:text-white'
                      : 'hover:bg-zinc-50 dark:hover:bg-neutral-700/50 text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  <p className="text-sm text-zinc-950 dark:text-white">{source}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
