import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, Activity, FileText, BarChart3, Play, Pause, ChevronUp } from 'lucide-react';
import { analyticsService, LogSource, LogSourceStats } from '@/features/logs/services/logs.service';
import { Button } from '@/components/radix/Button';
import { Input } from '@/components/radix/Input';
import { Alert, AlertDescription } from '@/components/radix/Alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/radix/Card';
import { Badge } from '@/components/radix/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/radix/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/radix/Select';
import { AnalyticsLogsTable } from '@/features/logs/components/AnalyticsLogsTable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/radix/Tooltip';
import { getSourceDisplayName, getOriginalSourceName } from '@/lib/utils/utils';

export default function AnalyticsLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(3000); // 3 seconds
  const [loadedLogs, setLoadedLogs] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pageSize = 100;

  // Fetch log sources
  const {
    data: sources,
    isLoading: sourcesLoading,
    error: sourcesError,
    refetch: refetchSources,
  } = useQuery({
    queryKey: ['analytics-sources'],
    queryFn: () => analyticsService.getLogSources(),
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => analyticsService.getLogSourceStats(),
  });

  // Fetch initial logs for selected source
  const {
    data: initialLogsData,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchInitialLogs,
  } = useQuery({
    queryKey: ['analytics-logs-initial', selectedSource],
    queryFn: async () => {
      if (!selectedSource) return null;
      
      // Convert display name back to original name for API call
      const originalSourceName = getOriginalSourceName(selectedSource);
      const data = await analyticsService.getLogsBySource(originalSourceName, pageSize, 0);
      return {
        logs: data.logs || [],
        total: data.total || 0,
        source: data.source,
      };
    },
    enabled: !!selectedSource,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Search logs (no pagination for search, just show first results)
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['analytics-search', searchQuery, pageSize],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      
      const data = await analyticsService.searchLogs(searchQuery, undefined, pageSize, 0);
      return {
        records: data.records || [],
        total: data.total || 0,
      };
    },
    enabled: !!searchQuery.trim(),
  });

  // Update loaded logs when initial data changes
  useEffect(() => {
    if (initialLogsData?.logs) {
      setLoadedLogs(initialLogsData.logs);
      setHasMore(initialLogsData.logs.length === pageSize);
      
      // Scroll to bottom on initial load to show newest logs
      // Use requestAnimationFrame and multiple timeouts to ensure DOM is fully rendered
      setIsAutoScrolling(true);
      
      const scrollToBottom = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      };
      
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 200);
        setTimeout(() => {
          scrollToBottom();
          // Re-enable infinite scroll after auto-scrolling is complete
          setIsAutoScrolling(false);
        }, 500);
      });
    }
  }, [initialLogsData, pageSize]);

  // Reset when source changes
  useEffect(() => {
    setLoadedLogs([]);
    setHasMore(true);
    setIsLoadingMore(false);
    setIsAutoScrolling(false);
    
    // Reset scroll position when source changes
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedSource]);

  // Auto scroll to bottom when new logs arrive and auto-refresh is on
  useEffect(() => {
    if (autoRefresh && scrollRef.current && loadedLogs.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loadedLogs.length, autoRefresh]);

  // Load more older logs
  const loadMoreLogs = useCallback(async () => {
    if (!selectedSource || !hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const originalSourceName = getOriginalSourceName(selectedSource);
      const offset = loadedLogs.length;
      const data = await analyticsService.getLogsBySource(originalSourceName, pageSize, offset);
      
      if (data.logs && data.logs.length > 0) {
        setLoadedLogs(prev => [...prev, ...data.logs]);
        setHasMore(data.logs.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more logs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedSource, loadedLogs.length, hasMore, isLoadingMore, pageSize]);

  // Handle scroll to load more
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Skip scroll handling during auto-scroll to prevent unwanted loads
    if (isAutoScrolling) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Load more when scrolled to bottom (for older logs)
    if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore && !isLoadingMore) {
      loadMoreLogs();
    }
  }, [hasMore, isLoadingMore, loadMoreLogs, isAutoScrolling]);

  const handleRefresh = () => {
    void refetchSources();
    void refetchStats();
    void refetchInitialLogs();
    void refetchSearch();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const formatLastActivity = (timestamp: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };


  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#f8f9fa]">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-30 bg-[#f8f9fa]">
          <div className="px-8 pt-6 pb-4">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <nav className="flex items-center text-[22px] font-semibold">
                  <Activity className="h-6 w-6 mr-2 text-blue-600" />
                  <span className="text-gray-900">Analytics Logs</span>
                </nav>

                {/* Separator */}
                <div className="mx-4 h-6 w-px bg-gray-200" />

                {/* Action buttons group */}
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={handleRefresh}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="center">
                        <p>Refresh</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Auto-refresh toggle */}
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={autoRefresh ? "default" : "ghost"}
                            size="sm"
                            className="h-9 px-3"
                            onClick={toggleAutoRefresh}
                          >
                            {autoRefresh ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                            <span className="text-xs">{refreshInterval / 1000}s</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center">
                          <p>{autoRefresh ? 'Stop' : 'Start'} auto-refresh</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Refresh interval selector */}
                    <Select 
                      value={refreshInterval.toString()} 
                      onValueChange={(value) => setRefreshInterval(parseInt(value))}
                      disabled={autoRefresh}
                    >
                      <SelectTrigger className="w-16 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1000">1s</SelectItem>
                        <SelectItem value="3000">3s</SelectItem>
                        <SelectItem value="5000">5s</SelectItem>
                        <SelectItem value="10000">10s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scroll to bottom button */}
                  {activeTab === 'logs' && selectedSource && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={scrollToBottom}
                          >
                            <ChevronUp className="h-4 w-4 rotate-180" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center">
                          <p>Scroll to latest</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {(sourcesError || statsError || logsError || searchError) && (
            <Alert variant="destructive" className="mb-4 mx-8 mt-4">
              <AlertDescription>
                {String(sourcesError || statsError || logsError || searchError)}
              </AlertDescription>
            </Alert>
          )}

          {activeTab === 'overview' && (
            <div className="flex-1 overflow-auto px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {/* Stats Cards - only show sources that are available */}
                {stats?.filter(stat => 
                  sources?.some(source => source.name === stat.source)
                ).map((stat) => (
                  <Card 
                    key={stat.source} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedSource(getSourceDisplayName(stat.source));
                      setActiveTab('logs');
                    }}
                  >
                    <CardHeader className="pb-3 pt-4">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className="truncate">{getSourceDisplayName(stat.source)}</span>
                        <Badge variant={stat.count > 0 ? "default" : "secondary"} className="ml-2">
                          {stat.count.toLocaleString()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-gray-600">
                          <BarChart3 className="h-3 w-3 text-blue-600 mr-1.5" />
                          <span>{stat.count > 0 ? 'Active' : 'No data'}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Last: {formatLastActivity(stat.lastActivity)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {statsLoading && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Loading analytics data...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Source selector */}
              <div className="px-8 pb-2 border-b bg-gray-50">
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-full max-w-sm h-8 text-sm">
                    <SelectValue placeholder="Select a log source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sources?.map((source) => (
                      <SelectItem key={source.id} value={getSourceDisplayName(source.name)}>
                        {getSourceDisplayName(source.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedSource ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Log Source</h3>
                    <p className="text-sm text-gray-500">
                      Choose a log source from the dropdown above to view logs
                    </p>
                  </div>
                </div>
              ) : (
                <AnalyticsLogsTable
                  logs={loadedLogs}
                  loading={logsLoading}
                  source={selectedSource}
                  onRefresh={refetchInitialLogs}
                  onScroll={handleScroll}
                  scrollRef={scrollRef}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  autoRefresh={autoRefresh}
                />
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="px-8 pb-2 border-b bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search across all logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 bg-white border-gray-200 rounded text-sm"
                  />
                </div>
              </div>

              {!searchQuery.trim() ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Search Analytics Logs</h3>
                    <p className="text-sm text-gray-500">
                      Enter a search term to find logs across all sources
                    </p>
                  </div>
                </div>
              ) : (
                <AnalyticsLogsTable
                  logs={searchResults?.records || []}
                  loading={searchLoading}
                  source="search"
                  onRefresh={refetchSearch}
                  showSource={true}
                  onScroll={() => {}}
                  scrollRef={scrollRef}
                  hasMore={false}
                  isLoadingMore={false}
                  autoRefresh={false}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}