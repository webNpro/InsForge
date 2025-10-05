import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useMemo } from 'react';
import { usageService, McpUsageRecord } from '../services/usage.service';
import { useSocket, ServerEvents } from '@/lib/contexts/SocketContext';

interface McpConnectedPayload {
  tool_name: string;
  real_time: string;
}

export function useMcpUsage(limit: number = 5, success: boolean = true) {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  const queryKey = useMemo(() => ['mcp-usage', limit, success], [limit, success]);

  // Initial fetch - only runs once on mount or when params change
  const query = useQuery<McpUsageRecord[]>({
    queryKey,
    queryFn: () => usageService.getMcpUsage(limit, success),
    staleTime: Infinity, // Never consider stale since we update via socket
    refetchInterval: false, // Disable polling
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Handle socket updates without causing re-renders
  const handleMcpUpdate = useCallback(
    (payload: { id: string; payload: McpConnectedPayload; timestamp: number; type: string }) => {
      // Update the query cache directly without triggering a refetch
      queryClient.setQueryData<McpUsageRecord[]>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        // Create new record from socket payload
        const newRecord: McpUsageRecord = {
          tool_name: payload.payload.tool_name,
          success: true,
          created_at: payload.payload.real_time,
        };

        // Add new record to the beginning and maintain the limit
        const updatedData = [newRecord, ...oldData].slice(0, limit);

        return updatedData;
      });
    },
    [queryClient, queryKey, limit]
  );

  // Subscribe to socket events
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    // Listen for MCP connected events
    socket.on(ServerEvents.MCP_CONNECTED, handleMcpUpdate);

    // Cleanup listener on unmount
    return () => {
      socket.off(ServerEvents.MCP_CONNECTED, handleMcpUpdate);
    };
  }, [socket, isConnected, handleMcpUpdate]);

  return query;
}

export function useOnboardingStatus() {
  return useQuery<boolean>({
    queryKey: ['onboarding-status'],
    queryFn: () => usageService.hasCompletedOnboarding(),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}
