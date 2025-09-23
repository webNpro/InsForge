import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { PaginationControls } from '@/components/PaginationControls';
import type { AuditLogSchema } from '@insforge/shared-schemas';

interface LogsTableProps {
  logs: AuditLogSchema[];
  schema?: Record<string, unknown>;
  loading?: boolean;
  searchQuery?: string;
  onRefresh?: () => void;
  onConfirm?: (options: {
    title: string;
    description: string;
    confirmText?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
  currentPage?: number;
  totalRecords?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export function LogsTable({
  logs,
  loading,
  searchQuery = '',
  currentPage = 1,
  totalRecords = 0,
  pageSize = 50,
  onPageChange,
}: LogsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter logs based on search (client-side filtering on current page)
  const filteredLogs = useMemo(() => {
    if (!searchQuery || !logs) {
      return logs || [];
    }

    const lowerQuery = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.action?.toLowerCase().includes(lowerQuery) ||
        log.actor?.toLowerCase().includes(lowerQuery) ||
        log.module?.toLowerCase().includes(lowerQuery) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(lowerQuery))
    );
  }, [logs, searchQuery]);

  // Calculate total pages
  const totalPages = Math.ceil(totalRecords / pageSize);

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Logs are audit records and should not be individually deletable
  // They can only be cleared in bulk by admins if needed

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto relative">
        <table className="w-full bg-white dark:bg-neutral-900">
          <thead className="sticky top-0 z-20">
            <tr className="h-12.5 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
              <th className="px-4 text-left text-[13px] font-semibold text-gray-600 dark:text-neutral-400 min-w-45">
                Time
              </th>
              <th className="px-4 text-left text-[13px] font-semibold text-gray-600 dark:text-neutral-400 min-w-30">
                Actor
              </th>
              <th className="px-4 text-left text-[13px] font-semibold text-gray-600 dark:text-neutral-400 min-w-25">
                Action
              </th>
              <th className="px-4 text-left text-[13px] font-semibold text-gray-600 dark:text-neutral-400 min-w-30">
                Module
              </th>
              <th className="px-4 text-left text-[13px] font-semibold text-gray-600 dark:text-neutral-400 min-w-37.5">
                Details
              </th>
              <th className="px-4 text-left text-[13px] font-semibold text-gray-600 dark:text-neutral-400 min-w-30">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-gray-500 dark:text-neutral-400"
                >
                  {searchQuery ? 'No logs found matching your search' : 'No audit logs yet'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedRows.has(String(log.id));
                const details = log.details;

                return (
                  <React.Fragment key={log.id}>
                    <tr className="h-14 border-b border-gray-100 dark:border-neutral-800 transition-colors hover:bg-gray-50/50 dark:hover:bg-neutral-800/50">
                      <td className="px-4 text-[13px] text-gray-600 dark:text-neutral-400">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 text-sm font-medium text-gray-800 dark:text-neutral-200">
                        {log.actor}
                      </td>
                      <td className="px-4 text-gray-700 dark:text-neutral-300">{log.action}</td>
                      <td className="px-4 text-sm text-gray-700 dark:text-neutral-300">
                        {log.module}
                      </td>
                      <td className="px-4">
                        {details && typeof details === 'object' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(String(log.id))}
                            className="h-8 px-3 text-[13px] text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 mr-1 text-gray-600 dark:text-neutral-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 mr-1 text-gray-600 dark:text-neutral-400" />
                            )}
                            View Details
                          </Button>
                        ) : (
                          <span className="text-[13px] text-gray-500 dark:text-neutral-500">-</span>
                        )}
                      </td>
                      <td className="px-4">
                        <span className="font-mono text-[12px] text-gray-500 dark:text-neutral-500">
                          {log.ipAddress || '-'}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && details && typeof details === 'object' && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-3 bg-gray-50 dark:bg-neutral-800 border-b border-gray-100 dark:border-neutral-700"
                        >
                          <pre className="text-xs text-gray-700 dark:text-neutral-300 whitespace-pre-wrap font-mono bg-white dark:bg-neutral-900 p-3 rounded border border-border-gray dark:border-neutral-700">
                            {JSON.stringify(details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalRecords > pageSize && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={onPageChange}
          recordLabel="logs"
        />
      )}
    </div>
  );
}
