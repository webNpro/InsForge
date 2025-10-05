import { format } from 'date-fns';
import { useMcpUsage } from '@/features/usage/contexts/McpUsageContext';

interface McpCallRecordTableProps {
  className?: string;
}

export function McpCallRecordTable({ className }: McpCallRecordTableProps) {
  const { records, isLoading } = useMcpUsage();

  const formatRecordDescription = (toolName: string) => {
    // Convert tool names to more user-friendly descriptions
    const descriptions: Record<string, string> = {
      'get-metadata': 'Storage record',
      'get-backend-metadata': 'Cursor called for Gemini.',
      'get-table-schema': 'Cursor called for auth.',
      'run-raw-sql': 'Database query executed',
      'bulk-upsert': 'Data imported',
      'create-bucket': 'Storage bucket created',
      'delete-bucket': 'Storage bucket deleted',
      'create-function': 'Edge function created',
      'update-function': 'Edge function updated',
      'delete-function': 'Edge function deleted',
    };

    return descriptions[toolName] || `${toolName} executed`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy h:mm a');
  };

  return (
    <div className={`rounded-[8px] overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="bg-neutral-900 h-9 flex items-center justify-between text-neutral-400">
        <p className="flex-1 py-1 px-3 text-left">MCP Call Record</p>
        <p className="w-54 py-1 px-3 border-l border-neutral-700 text-left">Time</p>
      </div>

      {/* Table Body */}
      <div>
        {isLoading ? (
          <div className="h-9 flex items-center justify-center text-neutral-400">
            Loading records...
          </div>
        ) : records.length > 0 ? (
          <div className="divide-y divide-neutral-700">
            {records.slice(0, 5).map((record, index) => (
              <div
                key={`${record.tool_name}-${index}-${record.created_at}`}
                className="bg-[#333333] h-9 flex items-center justify-between text-white"
              >
                <p className="flex-1 py-1 px-3 text-left">
                  {formatRecordDescription(record.tool_name)}
                </p>
                <p className="w-54 py-1 px-3 border-l border-neutral-700 text-left">
                  {formatTime(record.created_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-9 flex items-center justify-center text-neutral-400">
            No MCP call records found
          </div>
        )}
      </div>
    </div>
  );
}
