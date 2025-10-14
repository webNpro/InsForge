import { useLogSources } from '@/features/logs/hooks/useLogSources';
import { LogsSidebar } from '@/features/logs/components/LogsSidebar';
import { LogsContent } from '@/features/logs/components/LogsContent';
import { EmptyState } from '@/components/EmptyState';

export default function LogsPage() {
  const {
    sourceNames,
    selectedSource,
    selectSource,
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useLogSources();

  return (
    <div className="h-full flex">
      <LogsSidebar
        sources={sourceNames}
        selectedSource={selectedSource}
        onSourceSelect={selectSource}
        loading={sourcesLoading}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-bg-gray dark:bg-neutral-800">
        {sourcesError ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Error loading log sources" description={String(sourcesError)} />
          </div>
        ) : !selectedSource ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="No Log Source Selected"
              description="Select a log source from the sidebar to view logs"
            />
          </div>
        ) : (
          <LogsContent source={selectedSource} />
        )}
      </div>
    </div>
  );
}
