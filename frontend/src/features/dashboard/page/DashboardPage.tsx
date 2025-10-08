import { useLocation } from 'react-router-dom';
import { useMetadata } from '@/features/metadata/hooks/useMetadata';
import { useUsers } from '@/features/auth';
import { Users, Database, HardDrive } from 'lucide-react';
import { ConnectionSuccessBanner, StatsCard } from '../components';
import { McpCallRecordTable } from '@/features/dashboard/components';

export default function DashboardPage() {
  const location = useLocation();
  const { metadata, auth, tables, storage, isLoading } = useMetadata();
  const { totalUsers } = useUsers();

  const authCount = auth?.oauths.length || 0;
  const showBanner = location.state?.showSuccessBanner === true;

  return (
    <main className="h-full bg-white dark:bg-neutral-800">
      <div className="flex justify-center py-6 px-0">
        <div className="flex flex-col gap-6 w-full max-w-[1080px] px-6">
          {/* Connection Success Banner - Only shows once on first connection */}
          {showBanner && <ConnectionSuccessBanner />}

          {/* Dashboard Header */}
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-[-0.1px]">
              Dashboard
            </h1>
          </div>

          {/* Stats Cards */}
          <div className="flex gap-6 w-full">
            <StatsCard
              icon={Users}
              title="AUTH"
              value={(totalUsers || 0).toLocaleString()}
              unit={totalUsers === 1 ? 'user' : 'users'}
              description={`${authCount} OAuth ${authCount === 1 ? 'provider' : 'providers'} enabled`}
              isLoading={isLoading}
            />

            <StatsCard
              icon={Database}
              title="Database"
              value={(metadata?.database?.totalSizeInGB || 0).toFixed(2)}
              unit="GB"
              description={`${tables.length || 0} ${tables.length === 1 ? 'Table' : 'Tables'}`}
              isLoading={isLoading}
            />

            <StatsCard
              icon={HardDrive}
              title="Storage"
              value={(storage?.totalSizeInGB || 0).toFixed(2)}
              unit="GB"
              description={`${storage?.buckets?.length || 0} ${storage?.buckets?.length === 1 ? 'Bucket' : 'Buckets'}`}
              isLoading={isLoading}
            />
          </div>

          <div className="flex items-center justify-between w-full">
            <p className="text-xl font-semibold text-gray-900 dark:text-white tracking-[-0.1px]">
              MCP Call Record
            </p>
            {/* <button className="text-sm text-gray-500 dark:text-gray-400">View More</button> */}
          </div>

          {/* MCP Call Record Table */}
          <div className="w-full">
            <McpCallRecordTable />
          </div>
        </div>
      </div>
    </main>
  );
}
