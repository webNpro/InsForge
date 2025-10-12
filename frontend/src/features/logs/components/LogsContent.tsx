import { useCallback, useRef, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { useMcpUsage } from '../hooks/useMcpUsage';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { PaginationControls } from '@/components/PaginationControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/radix/DropdownMenu';
import { Button } from '@/components/radix/Button';
import { Checkbox } from '@/components/Checkbox';
import { LogsTable, LogsTableColumn } from './LogsTable';
import { LogSchema } from '@insforge/shared-schemas';
import { McpUsageRecord } from '../services/usage.service';

interface LogsContentProps {
  source: string;
}

const SEVERITY_OPTIONS = [
  { value: 'error', label: 'Error', color: 'text-red-500' },
  { value: 'warning', label: 'Warning', color: 'text-yellow-500' },
  { value: 'informational', label: 'Info', color: 'text-gray-500' },
] as const;

function SeverityBadge({ severity }: { severity: string }) {
  const severityConfig = {
    error: { color: '#EF4444', label: 'Error' },
    warning: { color: '#FCD34D', label: 'Warning' },
    informational: { color: '#A3A3A3', label: 'Info' },
  };

  const config =
    severityConfig[severity as keyof typeof severityConfig] || severityConfig.informational;

  return (
    <div className="flex items-center gap-2 pr-1">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
      <span className="text-sm text-white font-normal leading-6">{config.label}</span>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function LogsContent({ source }: LogsContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMcpRecords = source === 'MCP records';
  const [mcpSearchQuery, setMcpSearchQuery] = useState('');
  // Default sort by time descending (latest first)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // MCP records data
  const { records: mcpRecords, isLoading: mcpLoading, error: mcpError } = useMcpUsage();

  // Regular logs data
  const {
    logs: paginatedLogs,
    filteredLogs,
    searchQuery: logsSearchQuery,
    setSearchQuery: setLogsSearchQuery,
    severityFilter,
    setSeverityFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    isLoading: logsLoading,
    isLoadingMore,
    hasMore,
    error: logsError,
    loadMoreLogs,
    getSeverity,
  } = useLogs(isMcpRecords ? '' : source);

  // Handle scroll to load more (only for regular logs)
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isMcpRecords) {
        return;
      }
      const { scrollTop } = e.currentTarget;
      if (scrollTop <= 100 && hasMore && !isLoadingMore) {
        void loadMoreLogs();
      }
    },
    [isMcpRecords, hasMore, isLoadingMore, loadMoreLogs]
  );

  // Handle sorting (only for time column)
  const handleSort = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Filtered and sorted MCP records
  const filteredMcpRecords = useMemo(() => {
    let filtered = mcpRecords;

    // Apply search filter
    if (mcpSearchQuery) {
      filtered = filtered.filter((record) =>
        record.tool_name.toLowerCase().includes(mcpSearchQuery.toLowerCase())
      );
    }

    // Apply sorting by time (created_at)
    filtered = [...filtered].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
    });

    return filtered;
  }, [mcpRecords, mcpSearchQuery, sortDirection]);

  // Sorted logs
  const sortedLogs = useMemo(() => {
    return [...paginatedLogs].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
    });
  }, [paginatedLogs, sortDirection]);

  // MCP columns
  const mcpColumns = useMemo(
    (): LogsTableColumn<McpUsageRecord>[] => [
      {
        key: 'tool_name',
        label: 'MCP Call',
        sortable: false,
      },
      {
        key: 'success',
        label: 'Status',
        width: '150px',
        sortable: false,
        render: (record) => (
          <span
            className={`text-sm font-normal leading-6 ${record.success ? 'text-green-500' : 'text-red-500'}`}
          >
            {record.success ? 'Success' : 'Failed'}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: 'Time',
        width: '250px',
        sortable: true,
        render: (record) => (
          <p className="text-sm text-white font-normal leading-6">
            {formatTime(record.created_at)}
          </p>
        ),
      },
    ],
    []
  );

  // Regular logs columns
  const renderLogMessage = useCallback(
    (log: (typeof paginatedLogs)[number]) => (
      <p className="text-sm text-white font-normal leading-6 break-all w-full">
        {log.eventMessage}
      </p>
    ),
    []
  );

  const renderSeverity = useCallback(
    (log: (typeof paginatedLogs)[number]) => <SeverityBadge severity={getSeverity(log)} />,
    [getSeverity]
  );

  const renderTime = useCallback(
    (log: (typeof paginatedLogs)[number]) => (
      <p className="text-sm text-white font-normal leading-6 flex-1">{formatTime(log.timestamp)}</p>
    ),
    []
  );

  const logsColumns = useMemo(
    (): LogsTableColumn<LogSchema>[] => [
      {
        key: 'event_message',
        label: 'Logs',
        sortable: false,
        render: renderLogMessage,
      },
      {
        key: 'severity',
        label: 'Severity',
        width: '200px',
        sortable: false,
        render: renderSeverity,
      },
      {
        key: 'timestamp',
        label: 'Time',
        width: '250px',
        sortable: true,
        render: renderTime,
      },
    ],
    [renderLogMessage, renderSeverity, renderTime]
  );

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4">
        <p className="text-xl text-zinc-950 dark:text-white mb-4">{source}</p>
        <div className="flex items-center gap-4">
          <SearchInput
            value={isMcpRecords ? mcpSearchQuery : logsSearchQuery}
            onChange={isMcpRecords ? setMcpSearchQuery : setLogsSearchQuery}
            placeholder={isMcpRecords ? 'Search MCP calls' : 'Search logs'}
            className="flex-1 max-w-80 dark:bg-neutral-800 dark:text-zinc-300 dark:border-neutral-700"
            debounceTime={300}
          />
          {!isMcpRecords && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-32 h-10 justify-between bg-transparent dark:bg-transparent border-gray-300 dark:border-neutral-600 text-zinc-950 dark:text-white"
                >
                  Severity
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-48"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                {SEVERITY_OPTIONS.map(({ value, label, color }) => (
                  <div
                    key={value}
                    className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-neutral-600 rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setSeverityFilter(
                        severityFilter.includes(value)
                          ? severityFilter.filter((s) => s !== value)
                          : [...severityFilter, value]
                      );
                    }}
                  >
                    <Checkbox checked={severityFilter.includes(value)} onChange={() => {}} />
                    <span className={color}>●</span>
                    <span className="text-zinc-950 dark:text-white text-sm">{label}</span>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4" ref={scrollRef} onScroll={handleScroll}>
        {isMcpRecords ? (
          mcpError ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState title="Error loading MCP records" description={String(mcpError)} />
            </div>
          ) : (
            <LogsTable<McpUsageRecord>
              columns={mcpColumns}
              data={filteredMcpRecords}
              isLoading={mcpLoading}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage={
                mcpSearchQuery ? 'No MCP records match your search' : 'No MCP records found'
              }
            />
          )
        ) : logsError ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState title="Error loading logs" description={String(logsError)} />
          </div>
        ) : (
          <>
            <LogsTable<LogSchema>
              columns={logsColumns}
              data={sortedLogs}
              isLoading={logsLoading}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage={
                filteredLogs.length === 0 ? 'No logs match your search criteria' : 'No logs found'
              }
            />
            {isLoadingMore && (
              <div className="py-4 text-center bg-neutral-800">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with Pagination - only for regular logs */}
      {!isMcpRecords && !logsLoading && filteredLogs.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalRecords={filteredLogs.length}
          pageSize={100}
          recordLabel="Logs"
        />
      )}
    </div>
  );
}
