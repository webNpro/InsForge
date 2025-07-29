import { Database } from 'lucide-react';

interface TableEmptyStateProps {
  searchTerm: string;
}

export function TableEmptyState({ searchTerm }: TableEmptyStateProps) {
  return (
    <div className="text-center py-8">
      <Database className="mx-auto h-8 w-8 text-muted-foreground mb-2.5" />
      <p className="text-sm text-muted-foreground">
        {searchTerm ? 'No tables found' : 'No tables yet'}
      </p>
      {!searchTerm && (
        <p className="text-xs text-muted-foreground mt-2.5">
          Create your first table to get started
        </p>
      )}
    </div>
  );
}
