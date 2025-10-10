import { isCloudEnvironment } from '@/utils/environment';
import { AIClientService } from './client';
import type { RawOpenRouterModel } from '@/types/ai';
import type { OpenRouterModel } from '@insforge/shared-schemas';

export interface ModelProviderInfo {
  provider: string;
  configured: boolean;
  models: OpenRouterModel[];
}

export interface ListModelsResponse {
  text: ModelProviderInfo[];
  image: ModelProviderInfo[];
}

// Define provider priority order: OpenAI -> Anthropic -> Google -> Amazon -> Others
const PROVIDER_ORDER: Record<string, number> = {
  openai: 1,
  anthropic: 2,
  google: 3,
  amazon: 4,
};

/**
 * Get the priority order for a provider based on its company ID
 * Returns a lower number for higher priority providers
 */
function getProviderOrder(companyId: string): number {
  return PROVIDER_ORDER[companyId.toLowerCase()] || 999;
}

/**
 * Sort models by provider order (OpenAI -> Anthropic -> Google -> Amazon -> Others)
 * and then by model name within each provider
 */
function sortModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.sort((a, b) => {
    const aCompanyId = a.id.split('/')[0] || '';
    const bCompanyId = b.id.split('/')[0] || '';

    const aProviderOrder = getProviderOrder(aCompanyId);
    const bProviderOrder = getProviderOrder(bCompanyId);

    // Sort by provider order first
    if (aProviderOrder !== bProviderOrder) {
      return aProviderOrder - bProviderOrder;
    }

    // Then sort by model name within the same provider
    return a.name.localeCompare(b.name);
  });
}

export class AIModelService {
  /**
   * Get all available AI models
   * Fetches from cloud API if in cloud environment, otherwise from OpenRouter directly
   */
  static async getModels(): Promise<ListModelsResponse> {
    const credentialsService = AIClientService.getInstance();
    const configured = credentialsService.isConfigured();

    if (!configured) {
      return {
        text: [
          {
            provider: 'openrouter',
            configured: false,
            models: [],
          },
        ],
        image: [
          {
            provider: 'openrouter',
            configured: false,
            models: [],
          },
        ],
      };
    }

    // Get API key from credentials service
    const apiKey = await credentialsService.getApiKey();

    // Determine the API endpoint based on environment
    const apiUrl = isCloudEnvironment()
      ? 'https://api.insforge.dev/ai/v1/models'
      : 'https://openrouter.ai/api/v1/models/user';

    // Fetch models from the appropriate endpoint
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: RawOpenRouterModel[] };
    const models = data.data || [];

    const textModels: OpenRouterModel[] = [];
    const imageModels: OpenRouterModel[] = [];

    for (const model of models) {
      // Classify based on output modality
      const transformedModel: OpenRouterModel = {
        ...model,
        architecture: model.architecture
          ? {
              inputModalities: model.architecture.input_modalities || [],
              outputModalities: model.architecture.output_modalities || [],
              tokenizer: model.architecture.tokenizer || '',
              instructType: model.architecture.instruct_type || '',
            }
          : undefined,
        topProvider: model.topProvider
          ? {
              isModerated: model.topProvider.is_moderated,
              contextLength: model.topProvider.context_length,
              maxCompletionTokens: model.topProvider.max_completion_tokens,
            }
          : undefined,
      };

      if (model.architecture?.output_modalities?.includes('image')) {
        imageModels.push(transformedModel);
      }

      if (model.architecture?.output_modalities?.includes('text')) {
        textModels.push(transformedModel);
      }
    }

    return {
      text: [
        {
          provider: 'openrouter',
          configured: true,
          models: sortModels(textModels),
        },
      ],
      image: [
        {
          provider: 'openrouter',
          configured: true,
          models: sortModels(imageModels),
        },
      ],
    };
  }
}
