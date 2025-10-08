import { OpenRouterModel, ModalitySchema } from '@insforge/shared-schemas';
import { AIModelCard } from './AIConfigCard';
import { getProviderLogo } from '../helpers';

interface ModelSelectionGridProps {
  models: OpenRouterModel[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  configuredModelIds: string[];
}

export function ModelSelectionGrid({
  models,
  selectedModelId,
  onSelectModel,
  configuredModelIds,
}: ModelSelectionGridProps) {
  if (models.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No models match the selected filters.
          </p>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-2">
            Try adjusting your input/output modality filters.
          </p>
        </div>
      </div>
    );
  }

  const sortedModels = [...models].sort((a, b) => {
    const aConfigured = configuredModelIds.includes(a.id);
    const bConfigured = configuredModelIds.includes(b.id);
    if (aConfigured === bConfigured) {
      return 0;
    }
    return aConfigured ? 1 : -1;
  });

  return (
    <div className="flex-1 grid grid-cols-3 gap-5 auto-rows-fr">
      {sortedModels.map((model) => {
        const companyId = model.id.split('/')[0];
        const isConfigured = configuredModelIds.includes(model.id);
        const isSelected = selectedModelId === model.id;

        // Transform OpenRouterModel to AIConfigExtended format for the card
        const supportedModalities: ModalitySchema[] = ['text', 'image'];
        const inputModality = (model.architecture?.inputModalities || ['text']).filter(
          (m): m is ModalitySchema => supportedModalities.includes(m as ModalitySchema)
        );
        const outputModality = (model.architecture?.outputModalities || ['text']).filter(
          (m): m is ModalitySchema => supportedModalities.includes(m as ModalitySchema)
        );

        const cardConfig = {
          id: model.id,
          modelId: model.id,
          inputModality,
          outputModality,
          provider: 'openrouter' as const,
          systemPrompt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          logo: getProviderLogo(companyId),
          pricing: model.pricing,
          usageStats: undefined,
        };

        return (
          <AIModelCard
            key={model.id}
            config={cardConfig}
            mode="selectable"
            isSelected={isSelected}
            isDisabled={isConfigured}
            onSelect={() => !isConfigured && onSelectModel(model.id)}
          />
        );
      })}
    </div>
  );
}
