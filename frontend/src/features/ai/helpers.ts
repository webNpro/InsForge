import {
  OpenRouterModel,
  ModalitySchema,
  AIConfigurationWithUsageSchema,
} from '@insforge/shared-schemas';

// Type for pricing information from OpenRouter model
type ModelPricing = {
  prompt: string;
  completion: string;
  image?: string;
  request?: string;
  webSearch?: string;
  internalReasoning?: string;
  inputCacheRead?: string;
  inputCacheWrite?: string;
};

export interface ModelOption {
  id: string;
  value: string;
  companyId: string;
  modelName: string;
  providerName: string;
  logo: React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined;
  inputModality: ModalitySchema[];
  outputModality: ModalitySchema[];
  priceLevel: number;
  usageStats?: {
    totalRequests: number;
  };
  systemPrompt?: string | null;
}

import { Type, Image } from 'lucide-react';
import GrokIcon from '@/assets/logos/grok.svg?react';
import GeminiIcon from '@/assets/logos/gemini.svg?react';
import ClaudeIcon from '@/assets/logos/claude_code.svg?react';
import OpenAIIcon from '@/assets/logos/openai.svg?react';
import AmazonIcon from '@/assets/logos/amazon.svg?react';

export const getModalityIcon = (
  modality: ModalitySchema
): React.FunctionComponent<React.SVGProps<SVGSVGElement>> => {
  switch (modality) {
    case 'text':
      return Type;
    case 'image':
      return Image;
    // case 'audio':
    //   return Mic;
    // case 'video':
    //   return Video;
    // case 'file':
    //   return File;
    default:
      return Type;
  }
};

export const formatTokenCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const getProviderDisplayName = (providerId: string): string => {
  const providerMap: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    openrouter: 'OpenRouter',
    azure: 'Azure',
    amazon: 'Amazon',
    xai: 'xAI',
    huggingface: 'HuggingFace',
  };

  return (
    providerMap[providerId.toLowerCase()] ||
    providerId.charAt(0).toUpperCase() + providerId.slice(1)
  );
};

export const getProviderLogo = (
  providerId: string
): React.FunctionComponent<React.SVGProps<SVGSVGElement>> | undefined => {
  const logoMap: Record<string, React.FunctionComponent<React.SVGProps<SVGSVGElement>>> = {
    anthropic: ClaudeIcon,
    openai: OpenAIIcon,
    google: GeminiIcon,
    xai: GrokIcon,
    amazon: AmazonIcon,
  };
  return logoMap[providerId];
};

// Calculate price level based on pricing data
export const calculatePriceLevel = (pricing: ModelPricing | undefined | null): number => {
  if (!pricing) {
    return 0;
  }

  // Check if it's free
  if (pricing.prompt === '0' && pricing.completion === '0') {
    return 0;
  }

  // Calculate average cost per 1M tokens (prompt + completion)
  // Convert from per-token to per-1M-tokens
  const promptCostPerToken = parseFloat(pricing.prompt) || 0;
  const completionCostPerToken = parseFloat(pricing.completion) || 0;
  const promptCostPer1M = promptCostPerToken * 1000000;
  const completionCostPer1M = completionCostPerToken * 1000000;
  const avgCostPer1M = (promptCostPer1M + completionCostPer1M) / 2;

  // Adjusted thresholds based on actual pricing data and user feedback
  if (avgCostPer1M <= 3) {
    return 1;
  } // ≤$3/1M tokens (Haiku, Gemini Flash, etc.)
  if (avgCostPer1M <= 15) {
    return 2;
  } // ≤$15/1M tokens (GPT-4o, Claude Sonnet, etc.)
  return 3; // >$15/1M tokens (Claude Opus, etc.)
};

// Helper function to filter AI models based on selected modalities
export const filterModelsByModalities = (
  models: OpenRouterModel[],
  selectedInputModalities: ModalitySchema[],
  selectedOutputModalities: ModalitySchema[]
): OpenRouterModel[] => {
  if (!models?.length) {
    return [];
  }

  return models.filter((model) => {
    const inputModalities = new Set(model.architecture?.inputModalities || []);
    const outputModalities = new Set(model.architecture?.outputModalities || []);
    return (
      selectedInputModalities.every((m) => inputModalities.has(m)) &&
      selectedOutputModalities.every((m) => outputModalities.has(m))
    );
  });
};

// Helper function to get friendly model name from model ID
export const getFriendlyModelName = (modelId: string): string => {
  // Extract the model name part (after the last slash)
  const modelName = modelId.split('/').pop() || modelId;

  // Convert kebab-case to Title Case
  return modelName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Sort modalities by predefined order
export const sortModalitiesByOrder = (modalities: ModalitySchema[]): ModalitySchema[] => {
  const order = ['text', 'image', 'audio', 'video', 'file'];
  return [...modalities].sort((a, b) => order.indexOf(a) - order.indexOf(b));
};

// Convert OpenRouterModel to ModelOption (for selectable models)
export const convertOpenRouterModelToOption = (model: OpenRouterModel): ModelOption => {
  const companyId = model.id.split('/')[0];
  const priceLevel = calculatePriceLevel(model.pricing);
  const supportedModalities: ModalitySchema[] = ['text', 'image'];

  return {
    id: model.id,
    value: model.id,
    companyId,
    modelName: model.name.split(':')[1],
    providerName: getProviderDisplayName(companyId),
    logo: getProviderLogo(companyId),
    inputModality: sortModalitiesByOrder(
      (model.architecture?.inputModalities || ['text']).filter((m): m is ModalitySchema =>
        supportedModalities.includes(m as ModalitySchema)
      )
    ),
    outputModality: sortModalitiesByOrder(
      (model.architecture?.outputModalities || ['text']).filter((m): m is ModalitySchema =>
        supportedModalities.includes(m as ModalitySchema)
      )
    ),
    priceLevel,
    usageStats: undefined,
    systemPrompt: undefined,
  };
};

// Convert AIConfigurationWithUsageSchema to ModelOption (for configured models)
export const convertConfigurationToOption = (
  config: AIConfigurationWithUsageSchema
): ModelOption => {
  const companyId = config.modelId.split('/')[0];

  return {
    id: config.id,
    value: config.modelId,
    companyId,
    modelName: getFriendlyModelName(config.modelId),
    providerName: getProviderDisplayName(companyId),
    logo: getProviderLogo(companyId),
    inputModality: sortModalitiesByOrder(config.inputModality),
    outputModality: sortModalitiesByOrder(config.outputModality),
    priceLevel: 0,
    usageStats: {
      totalRequests: config.usageStats?.totalRequests || 0,
    },
    systemPrompt: config.systemPrompt,
  };
};

// Sort models with configured ones at the end
export const sortModelsByConfigurationStatus = (
  models: ModelOption[],
  configuredModelIds: string[]
): ModelOption[] => {
  return [...models].sort((a, b) => {
    const aConfigured = configuredModelIds.includes(a.value);
    const bConfigured = configuredModelIds.includes(b.value);

    if (aConfigured === bConfigured) {
      return 0;
    }
    return aConfigured ? 1 : -1;
  });
};
