import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '@/features/ai/services/ai.service';
import { metadataService } from '@/features/metadata/services/metadata.service';
import { ListModelsResponse } from '@insforge/shared-schemas';

interface UseAIConfigurationsOptions {
  enabled?: boolean;
}

export function useAIConfigurations(options: UseAIConfigurationsOptions = {}) {
  const { enabled = true } = options;

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

    // Operations
    refetch,
  };
}
