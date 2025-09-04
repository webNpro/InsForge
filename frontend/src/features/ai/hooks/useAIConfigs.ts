import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '@/features/ai/services/ai.service';
import { metadataService } from '@/features/metadata/services/metadata.service';
import {
  ListModelsResponse,
  AIConfigurationSchema,
  CreateAIConfiguarationReqeust,
  UpdateAIConfiguarationReqeust,
} from '@insforge/shared-schemas';
import { useToast } from '@/lib/hooks/useToast';

interface UseAIConfigsOptions {
  enabled?: boolean;
}

export function useAIConfigs(options: UseAIConfigsOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Ensure API key is fetched
  const { data: apiKey } = useQuery({
    queryKey: ['apiKey'],
    queryFn: () => metadataService.fetchApiKey(),
    staleTime: Infinity,
  });

  // Fetch AI models configuration
  const {
    data: modelsData,
    isLoading,
    error,
    refetch,
  } = useQuery<ListModelsResponse>({
    queryKey: ['ai-models'],
    queryFn: () => aiService.getModels(),
    enabled: enabled && !!apiKey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch AI configurations list
  const {
    data: configurations,
    isLoading: isLoadingConfigurations,
    error: configurationsError,
    refetch: refetchConfigurations,
  } = useQuery<AIConfigurationSchema[]>({
    queryKey: ['ai-configurations'],
    queryFn: () => aiService.getConfigurations(),
    enabled: enabled && !!apiKey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create configuration mutation
  const createConfigurationMutation = useMutation({
    mutationFn: (data: CreateAIConfiguarationReqeust) => aiService.createConfiguration(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-configurations'] });
      showToast('AI configuration created successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to create configuration: ${error.message}`, 'error');
    },
  });

  // Update configuration mutation
  const updateConfigurationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAIConfiguarationReqeust }) =>
      aiService.updateConfiguration(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-configurations'] });
      showToast('AI configuration updated successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to update configuration: ${error.message}`, 'error');
    },
  });

  // Delete configuration mutation
  const deleteConfigurationMutation = useMutation({
    mutationFn: (id: string) => aiService.deleteConfiguration(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-configurations'] });
      showToast('AI configuration deleted successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to delete configuration: ${error.message}`, 'error');
    },
  });

  // Extract configured providers (memoized to maintain referential stability)
  const configuredTextProviders = useMemo(
    () => modelsData?.text?.filter((p) => p.configured) || [],
    [modelsData?.text]
  );
  const configuredImageProviders = useMemo(
    () => modelsData?.image?.filter((p) => p.configured) || [],
    [modelsData?.image]
  );

  // Extract unconfigured providers
  const unconfiguredTextProviders = modelsData?.text?.filter((p) => !p.configured) || [];
  const unconfiguredImageProviders = modelsData?.image?.filter((p) => !p.configured) || [];

  // Get all available models (flat list)
  const allTextModels = modelsData?.text?.flatMap((p) => p.models) || [];
  const allImageModels = modelsData?.image?.flatMap((p) => p.models) || [];

  // Check if any providers are configured
  const hasConfiguredTextProviders = configuredTextProviders.length > 0;
  const hasConfiguredImageProviders = configuredImageProviders.length > 0;
  const hasAnyConfiguration = hasConfiguredTextProviders || hasConfiguredImageProviders;

  return {
    // Raw data
    modelsData,
    isLoading,
    error,

    // Providers by type
    textProviders: modelsData?.text || [],
    imageProviders: modelsData?.image || [],

    // Configured providers
    configuredTextProviders,
    configuredImageProviders,

    // Unconfigured providers
    unconfiguredTextProviders,
    unconfiguredImageProviders,

    // Models lists
    allTextModels,
    allImageModels,

    // Status checks
    hasConfiguredTextProviders,
    hasConfiguredImageProviders,
    hasAnyConfiguration,

    // Configurations data
    configurations: configurations || [],
    isLoadingConfigurations,
    configurationsError,

    // Configuration mutations
    createConfiguration: createConfigurationMutation.mutate,
    updateConfiguration: updateConfigurationMutation.mutate,
    deleteConfiguration: deleteConfigurationMutation.mutate,

    // Mutation states
    isCreating: createConfigurationMutation.isPending,
    isUpdating: updateConfigurationMutation.isPending,
    isDeleting: deleteConfigurationMutation.isPending,

    // Operations
    refetch,
    refetchConfigurations,
  };
}
