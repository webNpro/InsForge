import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
  useMemo,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSocket, ServerEvents } from '@/lib/contexts/SocketContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { usageService, McpUsageRecord } from '@/features/usage/services/usage.service';

// ============================================================================
// Types
// ============================================================================

interface McpUsageContextValue {
  /** Latest MCP usage records */
  records: McpUsageRecord[];
  /** Whether the user has completed onboarding (has at least 1 MCP call) */
  hasCompletedOnboarding: boolean;
  /** Loading state for initial fetch */
  isLoading: boolean;
}

interface McpConnectedPayload {
  tool_name: string;
  real_time: string;
}

// ============================================================================
// Context & Provider
// ============================================================================

const McpUsageContext = createContext<McpUsageContextValue | undefined>(undefined);

interface McpUsageProviderProps {
  children: ReactNode;
}

/**
 * MCP Usage Provider - Manages MCP call records and onboarding status
 *
 * Responsibilities:
 * 1. Fetch initial MCP records on mount
 * 2. Notify parent window of initial onboarding status (once)
 * 3. Listen to real-time socket updates for new MCP calls
 * 4. Forward MCP call updates to parent window (ongoing)
 * 5. Maintain all records in local state
 */
export function McpUsageProvider({ children }: McpUsageProviderProps) {
  // State
  const [records, setRecords] = useState<McpUsageRecord[]>([]);
  const { socket, isConnected } = useSocket();
  const { isAuthenticated } = useAuth();

  // Refs
  const hasNotifiedInitialStatus = useRef(false);

  /**
   * Initial fetch - Get all MCP records from backend
   * Only runs when user is authenticated to prevent 401 errors
   */
  const { data, isLoading } = useQuery<McpUsageRecord[]>({
    queryKey: ['mcp-usage'],
    queryFn: () => usageService.getMcpUsage(),
    enabled: isAuthenticated,
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  /**
   * Update records when initial data is fetched
   */
  useEffect(() => {
    if (data) {
      setRecords(data);
    }
  }, [data]);

  /**
   * Notify parent window of initial onboarding status (ONLY ONCE)
   * Triggered after initial load completes
   */
  useEffect(() => {
    // Skip if already notified, still loading, no records, or not in iframe
    if (
      hasNotifiedInitialStatus.current ||
      isLoading ||
      records.length === 0 ||
      window.parent === window
    ) {
      return;
    }

    // Mark as notified before sending to prevent race conditions
    hasNotifiedInitialStatus.current = true;

    const latestRecord = records[0];
    window.parent.postMessage(
      {
        type: 'ONBOARDING_COMPLETED',
        connected: true,
        tool_name: latestRecord.tool_name,
        timestamp: latestRecord.created_at,
      },
      '*'
    );
  }, [isLoading, records]);

  /**
   * Handle real-time MCP connection events from socket
   * Update local state and notify parent window
   */
  const handleMcpConnected = useCallback(
    (data: { id: string; payload: McpConnectedPayload; timestamp: number; type: string }) => {
      // Create new record from socket payload
      const newRecord: McpUsageRecord = {
        tool_name: data.payload.tool_name,
        success: true,
        created_at: data.payload.real_time,
      };

      // Update local state
      setRecords((prev) => [newRecord, ...prev]);

      // Notify parent window with latest MCP call info (ongoing updates)
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'MCP_CONNECTION_STATUS',
            connected: true,
            tool_name: data.payload.tool_name,
            timestamp: data.payload.real_time,
          },
          '*'
        );
      }
    },
    []
  );

  /**
   * Subscribe to socket MCP connection events
   */
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    socket.on(ServerEvents.MCP_CONNECTED, handleMcpConnected);

    return () => {
      socket.off(ServerEvents.MCP_CONNECTED, handleMcpConnected);
    };
  }, [socket, isConnected, handleMcpConnected]);

  // Context value
  const value = useMemo<McpUsageContextValue>(
    () => ({
      records,
      hasCompletedOnboarding: records.length > 0,
      isLoading,
    }),
    [records, isLoading]
  );

  return <McpUsageContext.Provider value={value}>{children}</McpUsageContext.Provider>;
}

/**
 * Hook to access MCP usage context
 * Must be used within McpUsageProvider
 */
export function useMcpUsage() {
  const context = useContext(McpUsageContext);
  if (!context) {
    throw new Error('useMcpUsage must be used within McpUsageProvider');
  }
  return context;
}
