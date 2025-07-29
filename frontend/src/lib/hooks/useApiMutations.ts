import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';

export function useApiMutations() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const createTable = useMutation({
    mutationFn: ({ tableName, columns }: { tableName: string; columns: any[] }) =>
      apiClient.post(`/database/tables`, { name: tableName, columns }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
    },
    onError: (error: any) => {
      showToast(`Failed to create table: ${error.message}`, 'error');
    },
  });

  const deleteTable = useMutation({
    mutationFn: (tableName: string) => apiClient.delete(`/database/tables/${tableName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
    },
    onError: (error: any) => {
      showToast(`Failed to delete table: ${error.message}`, 'error');
    },
  });

  const modifyTable = useMutation({
    mutationFn: ({ tableName, changes }: { tableName: string; changes: any }) =>
      apiClient.patch(`/database/tables/${tableName}`, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
      queryClient.invalidateQueries({ queryKey: ['table-schema'] });
    },
    onError: (error: any) => {
      showToast(`Failed to modify table: ${error.message}`, 'error');
    },
  });

  const createRecords = useMutation({
    mutationFn: ({ tableName, records }: { tableName: string; records: any[] }) =>
      apiClient.post(`/database/records/${tableName}`, records),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
      showToast(`${variables.records.length} record(s) created successfully`, 'success');
    },
    onError: (error: any) => {
      showToast(`Failed to create records: ${error.message}`, 'error');
    },
  });

  const updateRecord = useMutation({
    mutationFn: ({
      tableName,
      recordId,
      updates,
    }: {
      tableName: string;
      recordId: string;
      updates: any;
    }) => apiClient.patch(`/database/records/${tableName}?id=eq.${recordId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
    },
    onError: (error: any) => {
      showToast(`Failed to update record: ${error.message}`, 'error');
    },
  });

  const deleteRecord = useMutation({
    mutationFn: ({ tableName, recordId }: { tableName: string; recordId: string }) =>
      apiClient.delete(`/database/records/${tableName}?id=eq.${recordId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
      queryClient.invalidateQueries({ queryKey: ['metadata'] });
    },
    onError: (error: any) => {
      showToast(`Failed to delete record: ${error.message}`, 'error');
    },
  });

  const createUser = useMutation({
    mutationFn: (userData: { email: string; password: string; role: string }) =>
      apiClient.post('/auth/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      showToast(`Failed to create user: ${error.message}`, 'error');
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/auth/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      showToast(`Failed to delete user: ${error.message}`, 'error');
    },
  });

  return {
    createTable,
    deleteTable,
    modifyTable,
    createRecords,
    updateRecord,
    deleteRecord,
    createUser,
    deleteUser,
  };
}
