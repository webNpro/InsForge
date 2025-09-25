import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functionsService, type EdgeFunction } from '../services/functions.service';
import { useToast } from '@/lib/hooks/useToast';

export function useFunctions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedFunction, setSelectedFunction] = useState<EdgeFunction | null>(null);

  // Query to fetch all functions
  const {
    data: functions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['functions'],
    queryFn: () => functionsService.listFunctions(),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Function to fetch and set selected function details
  const selectFunction = useCallback(
    async (func: EdgeFunction) => {
      try {
        const data = await functionsService.getFunctionBySlug(func.slug);
        setSelectedFunction(data);
      } catch (error) {
        console.error('Failed to fetch function details:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load function details';
        showToast(errorMessage, 'error');
      }
    },
    [showToast]
  );

  // Function to clear selected function (back to list)
  const clearSelection = useCallback(() => {
    setSelectedFunction(null);
  }, []);

  // Delete function mutation (for future use)
  const deleteFunctionMutation = useMutation({
    mutationFn: (slug: string) => functionsService.deleteFunction(slug),
    onSuccess: (_, slug) => {
      void queryClient.invalidateQueries({ queryKey: ['functions'] });
      showToast('Function deleted successfully', 'success');
      // Clear selection if deleted function was selected
      if (selectedFunction && selectedFunction.slug === slug) {
        setSelectedFunction(null);
      }
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete function';
      showToast(errorMessage, 'error');
    },
  });

  // Helper to check if a function is selected
  const isViewingDetail = selectedFunction !== null;

  // Helper to get function by slug
  const getFunctionBySlug = useCallback(
    (slug: string): EdgeFunction | undefined => {
      return functions.find((func) => func.slug === slug);
    },
    [functions]
  );

  return {
    // Data
    functions,
    functionsCount: functions.length,
    selectedFunction,
    isViewingDetail,

    // Loading states
    isLoading,
    isDeleting: deleteFunctionMutation.isPending,

    // Error
    error,

    // Actions
    selectFunction,
    clearSelection,
    deleteFunction: deleteFunctionMutation.mutate,
    refetch,

    // Helpers
    getFunctionBySlug,
  };
}
