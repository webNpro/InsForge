import { Key } from 'lucide-react';

interface SecretEmptyStateProps {
  searchQuery: string;
}

export default function SecretEmptyState({ searchQuery }: SecretEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 rounded-[8px] bg-neutral-100 dark:bg-[#333333]">
      <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <div className="flex flex-col items-center justify-center gap-1">
        <p className="text-sm font-medium text-zinc-950 dark:text-white">
          {searchQuery ? 'No matching secrets found' : 'No secrets configured'}
        </p>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          {searchQuery
            ? 'Try adjusting your search terms'
            : 'Create environment variables for your edge functions'}
        </p>
      </div>
    </div>
  );
}
