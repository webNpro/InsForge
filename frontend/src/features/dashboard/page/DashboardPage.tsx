import { useNavigate, useLocation } from 'react-router-dom';
import { useMetadata } from '@/features/metadata/hooks/useMetadata';
import { Skeleton } from '@/components/radix/Skeleton';
import { Card, CardContent } from '@/components/radix/Card';
import { Users, Database, HardDrive, ArrowLeftRight, Link2 } from 'lucide-react';
import { useUsers } from '@/features/auth';

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { metadata, auth, tables, storage, isLoading } = useMetadata();
  const { totalUsers } = useUsers();

  const handleNavigateTo = (to: string, state?: { initialTab?: string }) => {
    const basePath = location.pathname.includes('/cloud')
      ? location.pathname.replace('/dashboard', '')
      : location.pathname;
    void navigate(`${basePath}/${to}`, { state });
  };

  const handleConnectInsForge = () => {
    if (window.parent !== window) {
      // Send message to parent window to open onboarding overlay
      window.parent.postMessage(
        {
          type: 'SHOW_CONNECT_OVERLAY',
        },
        '*'
      );
    } else {
      void handleNavigateTo('onboard');
    }
  };

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

          {/* Connect InsForge Card */}
          <Card className="w-full bg-white dark:bg-[#333333] rounded-lg border border-gray-200 dark:border-neutral-700 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
            <CardContent className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-black dark:text-white" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Connect InsForge
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-neutral-400">
                    With InsForge connected, your agent takes care of the backend for you
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-300 hover:bg-emerald-400 text-black rounded font-medium text-sm transition-colors cursor-pointer"
                  onClick={handleConnectInsForge}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                  Connect
                </button>
              </div>
            </CardContent>
          </Card>

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
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-neutral-700" />
                    ) : (
                      <>
                        <span className="text-2xl font-normal text-gray-900 dark:text-white tracking-[-0.144px]">
                          {(totalUsers || 0).toLocaleString()}
                        </span>
                        <span className="text-sm font-normal text-gray-500 dark:text-neutral-400">
                          {totalUsers === 1 ? 'user' : 'users'}
                        </span>
                      </>
                    )}
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-5 w-36 bg-gray-200 dark:bg-neutral-700" />
                  ) : (
                    <p className="text-base text-gray-500 dark:text-neutral-400">
                      {(() => {
                        const authCount = auth?.oauths.length || 0;
                        return `${authCount} OAuth ${authCount === 1 ? 'provider' : 'providers'} enabled`;
                      })()}
                    </p>
                  )}
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
                    {isLoading ? (
                      <Skeleton className="h-8 w-14 bg-gray-200 dark:bg-neutral-700" />
                    ) : (
                      <>
                        <span className="text-2xl font-normal text-gray-900 dark:text-white tracking-[-0.144px]">
                          {(metadata?.database?.totalSize || 0).toFixed(2)}
                        </span>
                        <span className="text-sm font-normal text-gray-500 dark:text-neutral-400">
                          GB
                        </span>
                      </>
                    )}
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16 bg-gray-200 dark:bg-neutral-700" />
                  ) : (
                    <p className="text-base text-gray-500 dark:text-neutral-400">
                      {tables.length || 0} {tables.length === 1 ? 'Table' : 'Tables'}
                    </p>
                  )}
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
                    {isLoading ? (
                      <Skeleton className="h-8 w-14 bg-gray-200 dark:bg-neutral-700" />
                    ) : (
                      <>
                        <span className="text-2xl font-normal text-gray-900 dark:text-white tracking-[-0.144px]">
                          {(storage?.totalSize || 0).toFixed(2)}
                        </span>
                        <span className="text-sm font-normal text-gray-500 dark:text-neutral-400">
                          GB
                        </span>
                      </>
                    )}
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20 bg-gray-200 dark:bg-neutral-700" />
                  ) : (
                    <p className="text-base text-gray-500 dark:text-neutral-400">
                      {storage?.buckets?.length || 0}{' '}
                      {storage?.buckets?.length === 1 ? 'Bucket' : 'Buckets'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
