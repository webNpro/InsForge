import { useQuery } from '@tanstack/react-query';
import { metadataService } from '@/features/metadata/services/metadata.service';
import { authService } from '@/features/auth/services/auth.service';
import { Skeleton } from '@/components/radix/Skeleton';
import { Card, CardContent } from '@/components/radix/Card';
import { Users, Database, HardDrive } from 'lucide-react';

export default function DashboardPage() {
  const {
    data: metadata,
    isLoading,
    refetch: _refetchMetadata,
  } = useQuery({
    queryKey: ['dashboard-metadata'],
    queryFn: () => metadataService.getDashboardMetadata(),
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

  const { data: fullMetadata } = useQuery({
    queryKey: ['full-metadata'],
    queryFn: () => metadataService.getFullMetadata(),
    enabled: !!apiKey,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="h-full bg-white dark:bg-neutral-800">
      <div className="flex justify-center py-6 px-0">
        <div className="flex flex-col gap-6 w-full max-w-[1080px] px-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-[-0.1px]">
              Dashboard
            </h1>
          </div>

          {/* Stats Cards */}
          <div className="flex gap-6 w-full">
            {/* AUTH Card */}
            <Card className="flex-1 bg-white dark:bg-[#333333] rounded-lg border border-gray-200 dark:border-neutral-700 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] h-[280px]">
              <CardContent className="p-8 h-full flex flex-col justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 h-7">
                    <Users className="w-5 h-5 text-gray-700 dark:text-white" />
                    <span className="text-base font-normal text-gray-900 dark:text-white">
                      AUTH
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-normal text-gray-900 dark:text-white tracking-[-0.144px]">
                      {(usersData?.records?.length || 0).toLocaleString()}
                    </span>
                    <span className="text-sm font-normal text-gray-500 dark:text-neutral-400">
                      {usersData?.records?.length === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                  <p className="text-base text-gray-500 dark:text-neutral-400">
                    {(() => {
                      const authCount =
                        (fullMetadata?.auth?.google?.enabled ? 1 : 0) +
                        (fullMetadata?.auth?.github?.enabled ? 1 : 0);
                      return `${authCount} OAuth ${authCount === 1 ? 'provider' : 'providers'} enabled`;
                    })()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Database Card */}
            <Card className="flex-1 bg-white dark:bg-[#333333] rounded-lg border border-gray-200 dark:border-neutral-700 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] h-[280px]">
              <CardContent className="p-8 h-full flex flex-col justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 h-7">
                    <Database className="w-5 h-5 text-gray-700 dark:text-white" />
                    <span className="text-base font-normal text-gray-900 dark:text-white">
                      Database
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-normal text-gray-900 dark:text-white tracking-[-0.144px]">
                      {(metadata?.databaseSizeGb || 0).toFixed(2)}
                    </span>
                    <span className="text-sm font-normal text-gray-500 dark:text-neutral-400">
                      GB
                    </span>
                  </div>
                  <p className="text-base text-gray-500 dark:text-neutral-400">
                    {fullMetadata?.database?.tables?.length || 0}{' '}
                    {fullMetadata?.database?.tables?.length === 1 ? 'Table' : 'Tables'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Storage Card */}
            <Card className="flex-1 bg-white dark:bg-[#333333] rounded-lg border border-gray-200 dark:border-neutral-700 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] h-[280px]">
              <CardContent className="p-8 h-full flex flex-col justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 h-7">
                    <HardDrive className="w-5 h-5 text-gray-700 dark:text-white" />
                    <span className="text-base font-normal text-gray-900 dark:text-white">
                      Storage
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-normal text-gray-900 dark:text-white tracking-[-0.144px]">
                      {(metadata?.storageSizeGb || 0).toFixed(2)}
                    </span>
                    <span className="text-sm font-normal text-neutral-400">GB</span>
                  </div>
                  <p className="text-base text-neutral-400">
                    {fullMetadata?.storage?.buckets?.length || 0}{' '}
                    {fullMetadata?.storage?.buckets?.length === 1 ? 'Bucket' : 'Buckets'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-bg-gray dark:bg-neutral-800">
      <div className="sticky top-0 z-30 bg-bg-gray border-b border-gray-200 dark:bg-neutral-800 dark:border-neutral-700">
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
