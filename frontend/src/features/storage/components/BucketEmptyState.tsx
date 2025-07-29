import { Folder } from 'lucide-react';

interface BucketEmptyStateProps {
  searchTerm: string;
}

export function BucketEmptyState({ searchTerm }: BucketEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Folder className="h-10 w-10 text-gray-400 mb-2.5" />
      <p className="text-sm text-gray-600 font-medium">
        {searchTerm ? 'No buckets found' : 'No buckets yet'}
      </p>
      <p className="text-xs text-gray-500 mt-2.5">
        {searchTerm ? 'Try a different search term' : 'Create your first bucket to get started'}
      </p>
    </div>
  );
}
