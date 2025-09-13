import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/features/auth/services/auth.service';

interface UseUsersOptions {
  pageSize?: number;
  enabled?: boolean;
  searchQuery?: string;
}

export function useUsers(options: UseUsersOptions = {}) {
  const { pageSize = 20, enabled = true, searchQuery = '' } = options;
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch users data
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', currentPage, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      });
      // Use the auth service to get users with search, backend handles filtering
      return authService.getUsers(params.toString(), searchQuery);
    },
    enabled: enabled,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });

  // Pagination calculations
  const totalPages = Math.ceil((usersData?.pagination.total || 0) / pageSize);

  return {
    // Data
    users: usersData?.users || [],
    totalUsers: usersData?.pagination.total || 0,
    isLoading,
    error,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,

    // Search
    searchQuery,

    // Operations
    refetch,
  };
}
