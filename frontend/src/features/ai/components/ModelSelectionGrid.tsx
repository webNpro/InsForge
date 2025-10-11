import { AIModelCard } from './AIConfigCard';
import { ModelOption } from '../helpers';

interface ModelSelectionGridProps {
  models: ModelOption[];
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
      <div className="flex-1 flex items-center justify-center min-h-[300px] mr-6">
        <div className="text-center">
          <p className="text-neutral-500 dark:text-neutral-400 text-base">
            No models match the selected filters.
          </p>
          <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-2">
            Try adjusting your input/output modality filters.
          </p>
        </div>
      </div>
    );
  }

  const sortedModels = [...models].sort((a, b) => {
    const aConfigured = configuredModelIds.includes(a.value);
    const bConfigured = configuredModelIds.includes(b.value);

    if (aConfigured === bConfigured) {
      return 0;
    }
    return aConfigured ? 1 : -1;
  });

  return (
    <div className="flex-1 grid grid-cols-3 gap-5 auto-rows-fr mr-6">
      {sortedModels.map((model) => {
        const isConfigured = configuredModelIds.includes(model.value);
        const isSelected = selectedModelId === model.value;

        return (
          <AIModelCard
            key={model.value}
            config={model}
            mode="selectable"
            isSelected={isSelected}
            isDisabled={isConfigured}
            onSelect={() => !isConfigured && onSelectModel(model.value)}
          />
        );
      })}
    </div>
  );
}
