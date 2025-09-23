import { useState, useEffect } from 'react';
import { RefreshCw, Search, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { Input } from '@/components/radix/Input';
import { Alert, AlertDescription } from '@/components/radix/Alert';
import { LogsTable } from '@/features/logs/components/LogsTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useConfirm } from '@/lib/hooks/useConfirm';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/radix/Tooltip';
import { useAuditLogs, useClearAuditLogs } from '@/features/logs/hooks/useAuditLogs';
import type { GetAuditLogsRequest } from '@insforge/shared-schemas';

export default function AuditsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Partial<GetAuditLogsRequest>>({});
  const pageSize = 50;
  const { confirm, confirmDialogProps } = useConfirm();

  // Calculate offset based on current page
  const offset = (currentPage - 1) * pageSize;

  // Fetch logs with pagination and filters
  const {
    data: logsResponse,
    isLoading,
    error,
    refetch,
  } = useAuditLogs({
    limit: pageSize,
    offset,
    ...filters,
  });

  const clearMutation = useClearAuditLogs();

  const handleRefresh = () => {
    void refetch();
  };

  const handleClearLogs = () => {
    void confirm({
      title: 'Clear Audit Logs',
      description:
        'Are you sure you want to clear old audit logs? This will keep the last 90 days of logs.',
      confirmText: 'Clear Logs',
      cancelText: 'Cancel',
    }).then((confirmed) => {
      if (confirmed) {
        clearMutation.mutate(90);
      }
    });
  };

  // Apply search filter
  useEffect(() => {
    setCurrentPage(1);
    if (searchQuery) {
      // Search can filter by actor, action, or module
      setFilters({
        actor: searchQuery,
      });
    } else {
      setFilters({});
    }
  }, [searchQuery]);

  // Extract data from response
  const logsData = logsResponse?.data || [];
  const totalRecords = logsResponse?.pagination?.total || 0;
  return (
    <div className="flex h-full bg-bg-gray dark:bg-neutral-800">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-30 bg-bg-gray dark:bg-neutral-800">
          <div className="px-8 pt-6 pb-4">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <nav className="flex items-center text-[22px] font-semibold">
                  <span className="text-gray-900 dark:text-white">Audit Logs</span>
                </nav>

                {/* Separator */}
                <div className="mx-4 h-6 w-px bg-gray-200 dark:bg-neutral-700" />

                {/* Action buttons group */}
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-neutral-700"
                          onClick={handleRefresh}
                          disabled={isLoading}
                        >
                          <RefreshCw
                            className={`h-4 w-4 text-gray-600 dark:text-neutral-400 ${isLoading ? 'animate-spin' : ''}`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="center">
                        <p>Refresh</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-neutral-700"
                          onClick={handleClearLogs}
                          disabled={clearMutation.isPending || logsData.length === 0}
                        >
                          <Trash2 className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="center">
                        <p>Clear old logs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mt-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-neutral-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 rounded-full text-sm"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <Alert variant="destructive" className="mb-4 mx-8 mt-4">
              <AlertDescription>{String(error)}</AlertDescription>
            </Alert>
          )}

          {logsData.length === 0 && !isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-neutral-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Audit Logs Available
                </h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                  {searchQuery
                    ? 'No logs found matching your search criteria'
                    : 'Audit logs will appear here once operations are performed'}
                </p>
              </div>
            </div>
          ) : (
            <LogsTable
              logs={logsData}
              loading={isLoading}
              searchQuery={searchQuery}
              onRefresh={() => void refetch()}
              onConfirm={confirm}
              currentPage={currentPage}
              totalRecords={totalRecords}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
