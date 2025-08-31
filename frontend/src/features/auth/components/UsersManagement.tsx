import { useEffect, useMemo, useState } from 'react';
import { useUsers } from '@/features/auth/hooks/useUsers';
import { authService } from '@/features/auth/services/auth.service';
import { UsersDataGrid } from './UsersDataGrid';
import { SortColumn } from 'react-data-grid';

interface UserManagementProps {
  searchQuery?: string;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (selectedRows: Set<string>) => void;
  onAddUser?: () => void;
}

export function UsersManagement({
  searchQuery: externalSearchQuery = '',
  selectedRows: externalSelectedRows,
  onSelectedRowsChange: externalOnSelectedRowsChange,
  onAddUser,
}: UserManagementProps) {
  // Default page size of 20 records per page
  const pageSize = 20;
  const { users, totalUsers, isLoading, currentPage, setCurrentPage, totalPages, refetch } =
    useUsers({ searchQuery: externalSearchQuery, pageSize });

  // Multi-select state - use external state if provided, otherwise internal
  const [internalSelectedRows, setInternalSelectedRows] = useState<Set<string>>(new Set());
  const selectedRows = externalSelectedRows || internalSelectedRows;
  const setSelectedRows = externalOnSelectedRowsChange || setInternalSelectedRows;

  // Sorting state
  const [sortColumns, setSortColumns] = useState<SortColumn[]>([]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      // Reset sorting columns
      setSortColumns([]);
      // Reset selected rows
      setSelectedRows(new Set());
      // Refetch data
      void refetch();
    };
    window.addEventListener('refreshUsers', handleRefresh);
    return () => window.removeEventListener('refreshUsers', handleRefresh);
  }, [refetch, setSelectedRows]);

  // Clear selection when page changes or search changes
  useEffect(() => {
    setSelectedRows(new Set());
  }, [currentPage, externalSearchQuery, setSelectedRows]);

  // Handle single user deletion
  const handleDeleteSingleUser = async (userId: string) => {
    try {
      await authService.deleteUsers([userId]);
      // Remove from selected rows if it was selected
      if (selectedRows.has(userId)) {
        const updated = new Set(selectedRows);
        updated.delete(userId);
        setSelectedRows(updated);
      }
      void refetch();
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  };

  // Apply sorting to users data
  const sortedUsers = useMemo(() => {
    if (!sortColumns.length) {
      return users;
    }

    return [...users].sort((a, b) => {
      for (const sort of sortColumns) {
        const { columnKey, direction } = sort;
        let aVal = a[columnKey];
        let bVal = b[columnKey];

        // Handle null/undefined values
        if (aVal === null && bVal === null) {
          continue;
        }
        if (aVal === null) {
          return direction === 'ASC' ? -1 : 1;
        }
        if (bVal === null) {
          return direction === 'ASC' ? 1 : -1;
        }

        // Convert to comparable values
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
        }
        if (typeof bVal === 'string') {
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) {
          return direction === 'ASC' ? -1 : 1;
        }
        if (aVal > bVal) {
          return direction === 'ASC' ? 1 : -1;
        }
      }
      return 0;
    });
  }, [users, sortColumns]);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <UsersDataGrid
          data={sortedUsers}
          loading={isLoading}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          sortColumns={sortColumns}
          onSortColumnsChange={setSortColumns}
          searchQuery={externalSearchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRecords={totalUsers}
          onPageChange={setCurrentPage}
          onDeleteRecord={(userId) => {
            void handleDeleteSingleUser(userId);
          }}
          emptyStateTitle="No users found"
          emptyStateDescription={
            externalSearchQuery
              ? 'No users match your search criteria'
              : 'Get started by adding your first user'
          }
          emptyStateActionText={!externalSearchQuery && onAddUser ? 'Add User' : undefined}
          onEmptyStateAction={!externalSearchQuery && onAddUser ? onAddUser : undefined}
        />
      </div>
    </div>
  );
}
