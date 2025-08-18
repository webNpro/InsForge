import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { metadataService } from '@/features/metadata/services/metadata.service';
import { authService } from '@/features/auth/services/auth.service';
import { SchemaVisualizer, VisualizerSkeleton } from '../components';
import { AuthProvider } from '../components/AuthNode';
import { Button } from '@/components/radix/Button';
import { Alert, AlertDescription } from '@/components/radix/Alert';
import {
  useSocket,
  ServerEvents,
  DataUpdatePayload,
  DataUpdateResourceType,
  SocketMessage,
} from '@/lib/contexts/SocketContext';
import Github from '@/assets/icons/github_dark.svg';
import Google from '@/assets/icons/google.svg';

const VisualizerPage = () => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const {
    data: metadata,
    isLoading: metadataLoading,
    error: metadataError,
    refetch: refetchMetadata,
  } = useQuery({
    queryKey: ['database-metadata-visualizer'],
    queryFn: () => metadataService.getFullMetadata(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const {
    data: userStats,
    isLoading: userStatsLoading,
    refetch: refetchUserStats,
  } = useQuery({
    queryKey: ['user-stats-visualizer'],
    queryFn: async () => {
      const response = await authService.getUsers();
      return { userCount: response.total };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const isLoading = metadataLoading || userStatsLoading;
  const error = metadataError;

  const handleRefresh = useCallback(() => {
    void refetchMetadata();
    void refetchUserStats();
  }, [refetchMetadata, refetchUserStats]);

  // Prepare authentication data for the visualizer
  const authData = useCallback(() => {
    if (!metadata?.auth) {
      return undefined;
    }

    // Check which providers are enabled from metadata
    const providers: AuthProvider[] = [
      {
        id: 'google',
        name: 'Google',
        icon: Google,
        enabled: metadata.auth.providers.includes('google'),
      },
      {
        id: 'github',
        name: 'GitHub',
        icon: Github,
        enabled: metadata.auth.providers.includes('github'),
      },
    ];

    const isConfigured = metadata.auth.enabled && providers.some((provider) => provider.enabled);

    return {
      providers,
      userCount: userStats?.userCount,
      sessionCount: undefined, // Could be added later if needed
      isConfigured,
    };
  }, [metadata, userStats])();

  // Listen for schema change events
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleDataUpdate = (message: SocketMessage<DataUpdatePayload>) => {
      if (
        message.payload?.resource === DataUpdateResourceType.METADATA ||
        message.payload?.resource === DataUpdateResourceType.DATABASE_SCHEMA ||
        message.payload?.resource === DataUpdateResourceType.TABLE_SCHEMA ||
        message.payload?.resource === DataUpdateResourceType.OAUTH_SCHEMA ||
        message.payload?.resource === DataUpdateResourceType.STORAGE_SCHEMA
      ) {
        // Invalidate all metadata-related queries
        void queryClient.invalidateQueries({ queryKey: ['database-metadata-visualizer'] });

        // Invalidate user stats if users were modified
        void queryClient.invalidateQueries({ queryKey: ['user-stats-visualizer'] });
      }
    };

    socket.on(ServerEvents.DATA_UPDATE, handleDataUpdate);

    return () => {
      socket.off(ServerEvents.DATA_UPDATE, handleDataUpdate);
    };
  }, [socket, isConnected, queryClient]);

  if (isLoading) {
    return <VisualizerSkeleton />;
  }

  if (!metadata || error) {
    return (
      <div className="relative min-h-screen bg-neutral-800 overflow-hidden">
        {/* Dot Matrix Background */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `radial-gradient(circle, #3B3B3B 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        />

        <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>
              Failed to load database schema. Please ensure the backend is running and try
              refreshing.
            </AlertDescription>
            <Button onClick={handleRefresh} className="mt-4 w-full" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-neutral-800 overflow-hidden">
      {/* Dot Matrix Background */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `radial-gradient(circle, #3B3B3B 1px, transparent 1px)`,
          backgroundSize: '12px 12px',
        }}
      />

      {/* Schema Visualizer */}
      <div className="relative z-10 w-full h-screen">
        <SchemaVisualizer metadata={metadata} authData={authData} />
      </div>
    </div>
  );
};

export default VisualizerPage;
