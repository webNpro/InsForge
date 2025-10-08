import { format } from 'date-fns';
import { useMcpUsage } from '@/features/usage/hooks/useMcpUsage';

export function McpUsageTable() {
  const { records } = useMcpUsage();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy h:mm a');
  };

  return (
    <div className={`rounded-[8px] overflow-hidden shadow-sm`}>
      {/* Table Header */}
      <div className="bg-[#f9fafb] dark:bg-neutral-900 h-9 flex items-center justify-between text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-transparent">
        <p className="flex-1 py-1 px-3 text-left">MCP Call</p>
        <p className="w-54 py-1 px-3 border-l border-neutral-200 dark:border-neutral-700 text-left">
          Time
        </p>
      </div>

      {/* Table Body */}
      <div>
        {records.length > 0 ? (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {records.slice(0, 5).map((record, index) => (
              <div
                key={`${record.tool_name}-${index}-${record.created_at}`}
                className="bg-neutral-50 dark:bg-[#333333] h-9 flex items-center justify-between text-neutral-500 dark:text-white"
              >
                <p className="flex-1 py-1 px-3 text-left">{record.tool_name}</p>
                <p className="w-54 py-1 px-3 border-l border-neutral-200 dark:border-neutral-700 text-left">
                  {formatTime(record.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-9 flex items-center justify-center text-neutral-500 dark:text-neutral-400 select-none bg-white dark:bg-[#333333]">
            No MCP call records found
          </div>
        )}
      </div>
    </div>
  );
}
