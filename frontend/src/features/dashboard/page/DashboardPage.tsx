import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { metadataService } from '@/features/dashboard/services/metadata.service';
import { authService } from '@/features/auth/services/auth.service';
import { Card, CardContent } from '@/components/radix/Card';
import { Skeleton } from '@/components/radix/Skeleton';
import { Alert, AlertDescription } from '@/components/radix/Alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/radix/Tabs';
import { CursorDeeplinkGenerator } from '@/features/dashboard';
import { JsonHighlight } from '@/components';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = React.useState<'macos-linux' | 'windows'>('macos-linux');

  const {
    data: metadata,
    isLoading,
    refetch: _refetchMetadata,
  } = useQuery({
    queryKey: ['metadata'],
    queryFn: () => metadataService.getAppMetadata(),
  });

  const { data: apiKey } = useQuery({
    queryKey: ['apiKey'],
    queryFn: () => metadataService.fetchApiKey(),
    staleTime: Infinity,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-count'],
    queryFn: () => authService.getUsers(),
    enabled: !!apiKey,
  });

  const handleTabChange = (value: string) => {
    if (value === 'macos-linux' || value === 'windows') {
      setActiveTab(value);
    }
  };

  // Create MCP configuration based on the active tab
  const mcpConfig = React.useMemo(() => {
    const baseEnv = {
      API_KEY: apiKey || 'your-api-key-here',
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };

    if (activeTab === 'windows') {
      // Windows configuration with cmd wrapper
      return {
        mcpServers: {
          insforge: {
            command: 'cmd',
            args: ['/c', 'npx', '-y', '@insforge/insforge-mcp@latest'],
            env: baseEnv,
          },
        },
      };
    } else {
      // macOS/Linux configuration with direct npx
      return {
        mcpServers: {
          insforge: {
            command: 'npx',
            args: ['-y', '@insforge/insforge-mcp@latest'],
            env: baseEnv,
          },
        },
      };
    }
  }, [apiKey, activeTab]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}

      {/* Main Content - Centered with max width */}
      <div className="px-8 py-8 flex justify-center">
        <div className="w-full max-w-[1032px]">
          <p className="text-2xl font-bold text-black mb-6 text-left w-full">Dashboard</p>
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-10">
            <Card className="bg-white border border-gray-200 rounded-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                    AUTH
                  </h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {usersData?.records?.length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">User</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                    Database
                  </h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(metadata?.database_size_gb || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">GB</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                    Storage
                  </h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(metadata?.storage_size_gb || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">GB</p>
              </CardContent>
            </Card>
          </div>

          {/* MCP Configuration Section */}
          <div className="p-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div>
              <h2 className="text-xl font-bold text-black mb-4">Get Started</h2>
              <div className="flex items-center gap-2 mb-4">
                <CursorDeeplinkGenerator
                  apiKey={apiKey}
                  apiBaseUrl={import.meta.env.VITE_API_BASE_URL}
                  os={activeTab}
                />
              </div>
              <p className="text-zinc-500 mb-3 text-sm">
                or copy the configuration below and add it to your AI assistant
              </p>
            </div>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="flex items-center justify-between">
                <TabsList className="grid w-60 grid-cols-2 bg-gray-100 p-1.5 rounded-md h-fit">
                  <TabsTrigger
                    value="macos-linux"
                    className="h-7 rounded-sm px-3 py-1 text-sm font-medium transition-all duration-200
                      data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm
                      data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                  >
                    MacOS/Linux
                  </TabsTrigger>
                  <TabsTrigger
                    value="windows"
                    className="h-7 rounded-sm px-3 py-1 text-sm font-medium transition-all duration-200
                      data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm
                      data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
                  >
                    Windows
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Configuration content */}
              <div className="pt-2">
                {!apiKey && (
                  <Alert className="border-yellow-200 bg-yellow-50 mb-4">
                    <AlertDescription className="text-yellow-800">
                      No API key found. Please ensure the backend is running and you&apos;re logged
                      in as an admin.
                    </AlertDescription>
                  </Alert>
                )}

                <JsonHighlight json={JSON.stringify(mcpConfig, null, 2)} />
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      <div className="sticky top-0 z-30 bg-[#f8f9fa] border-b border-gray-200">
        <div className="px-8 pt-6 pb-4">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-[1032px]">
          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    </main>
  );
}
