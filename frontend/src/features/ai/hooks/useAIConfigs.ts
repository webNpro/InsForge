import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '@/features/ai/services/ai.service';
import {
  ListModelsResponse,
  AIConfigurationWithUsageSchema,
  CreateAIConfigurationRequest,
  UpdateAIConfigurationRequest,
  ModalitySchema,
  type OpenRouterModel,
} from '@insforge/shared-schemas';
import { useToast } from '@/lib/hooks/useToast';
import {
  filterModelsByModalities,
  convertOpenRouterModelToOption,
  convertConfigurationToOption,
  sortModelsByConfigurationStatus,
  type ModelOption,
} from '../helpers';

interface UseAIConfigsOptions {
  enabled?: boolean;
}

export function useAIConfigs(options: UseAIConfigsOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Fetch AI models configuration
  const {
    data: modelsData,
    isLoading: isLoadingModels,
    error: modelsError,
  } = useQuery<ListModelsResponse>({
    queryKey: ['ai-models'],
    queryFn: () => aiService.getModels(),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch AI configurations list
  const {
    data: configurations,
    isLoading: isLoadingConfigurations,
    error: configurationsError,
  } = useQuery<AIConfigurationWithUsageSchema[]>({
    queryKey: ['ai-configurations'],
    queryFn: () => aiService.listConfigurations(),
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create configuration mutation
  const createConfigurationMutation = useMutation({
    mutationFn: (data: CreateAIConfigurationRequest) => aiService.createConfiguration(data),
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
    mutationFn: ({ id, data }: { id: string; data: UpdateAIConfigurationRequest }) =>
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

  // Convert configurations to ModelOptions (memoized)
  const configurationOptions = useMemo(
    () => (configurations || []).map(convertConfigurationToOption),
    [configurations]
  );

  // Get configured model IDs for filtering
  const configuredModelIds = useMemo(
    () => configurations?.map((config) => config.modelId) || [],
    [configurations]
  );

  // All configured models from all providers (flattened with deduplication)
  const allConfiguredModels = useMemo(() => {
    const uniqueModels = new Map<string, OpenRouterModel>();

    [...configuredTextProviders, ...configuredImageProviders].forEach((provider) => {
      provider.models.forEach((model) => {
        if (!uniqueModels.has(model.id)) {
          uniqueModels.set(model.id, model);
        }
      });
    });

    return Array.from(uniqueModels.values());
  }, [configuredTextProviders, configuredImageProviders]);

  // Helper function to get filtered and processed models
  const getFilteredModels = useCallback(
    (inputModality: ModalitySchema[], outputModality: ModalitySchema[]): ModelOption[] => {
      // If both modality arrays are empty, return all models
      const shouldFilter = inputModality.length > 0 || outputModality.length > 0;

      const filteredRawModels = shouldFilter
        ? filterModelsByModalities(allConfiguredModels, inputModality, outputModality)
        : allConfiguredModels;

      // Convert to ModelOption using centralized converter
      const modelOptions = filteredRawModels.map(convertOpenRouterModelToOption);

      // Sort with configured models at the end
      return sortModelsByConfigurationStatus(modelOptions, configuredModelIds);
    },
    [allConfiguredModels, configuredModelIds]
  );

  return {
    // Models data
    isLoadingModels,
    modelsError,

    // Configured providers
    allConfiguredModels,

    // Configurations data
    isLoadingConfigurations,
    configurationsError,

    // Configuration mutations
    createConfiguration: createConfigurationMutation.mutate,
    updateConfiguration: updateConfigurationMutation.mutate,
    deleteConfiguration: deleteConfigurationMutation.mutate,

    // Helper functions
    getFilteredModels,

    // Return converted configurations instead of raw data
    configurationOptions,
    configuredModelIds,
  };
}
