import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logService } from '../services/log.service';
import type { LogSchema } from '@insforge/shared-schemas';

const PAGE_SIZE = 100;

export function useLogs(source: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string[]>([
    'error',
    'warning',
    'informational',
  ]);
  const [loadedLogs, setLoadedLogs] = useState<LogSchema[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch initial logs
  const {
    data: initialLogsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['logs-content', source],
    queryFn: async () => {
      const data = await logService.getLogsBySource(source, PAGE_SIZE);
      return {
        logs: data.logs || [],
        total: data.total || 0,
      };
    },
    enabled: !!source,
    staleTime: 0,
  });

  // Update loaded logs when data changes
  useEffect(() => {
    if (initialLogsData?.logs !== undefined) {
      setLoadedLogs(initialLogsData.logs);
      setHasMore(initialLogsData.logs.length === PAGE_SIZE);
      setIsLoadingMore(false);
    }
  }, [initialLogsData]);

  // Reset page when search or severity filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, severityFilter]);

  // Load more older logs
  const loadMoreLogs = useCallback(async () => {
    if (!source || !hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const oldestTimestamp = loadedLogs.length > 0 ? loadedLogs[0]?.timestamp : undefined;
      const data = await logService.getLogsBySource(source, PAGE_SIZE, oldestTimestamp);

      if (data.logs && data.logs.length > 0) {
        setLoadedLogs((prev) => [...data.logs, ...prev]);
        setHasMore(data.logs.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more logs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [source, loadedLogs, hasMore, isLoadingMore]);

  // Get severity from log
  const getSeverity = useCallback((log: LogSchema): string => {
    const message = log.eventMessage.toLowerCase();
    if (message.includes('error') || log.body?.error) {
      return 'error';
    }
    if (message.includes('warning') || message.includes('warn')) {
      return 'warning';
    }
    return 'informational';
  }, []);

  // Filter logs by search and severity
  const filteredLogs = useMemo(() => {
    return loadedLogs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.eventMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.body).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        severityFilter.length === 0 || severityFilter.includes(getSeverity(log));

      return matchesSearch && matchesSeverity;
    });
  }, [loadedLogs, searchQuery, severityFilter, getSeverity]);

  // Calculate pagination
  const totalPages = useMemo(
    () => Math.ceil(filteredLogs.length / PAGE_SIZE),
    [filteredLogs.length]
  );
  const startIndex = useMemo(() => (currentPage - 1) * PAGE_SIZE, [currentPage]);
  const endIndex = useMemo(() => startIndex + PAGE_SIZE, [startIndex]);
  const paginatedLogs = useMemo(
    () => filteredLogs.slice(startIndex, endIndex),
    [filteredLogs, startIndex, endIndex]
  );

  return {
    // Data
    logs: paginatedLogs,
    allLogs: loadedLogs,
    filteredLogs,
    totalLogs: filteredLogs.length,

    // Filters
    searchQuery,
    setSearchQuery,
    severityFilter,
    setSeverityFilter,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,

    // Loading states
    isLoading,
    isLoadingMore,
    hasMore,

    // Error
    error,

    // Actions
    loadMoreLogs,
    refetch,
    getSeverity,
  };
}
