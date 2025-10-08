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
    const aConfigured = configuredModelIds.includes(a.value);
    const bConfigured = configuredModelIds.includes(b.value);
    if (aConfigured === bConfigured) {
      return 0;
    }
    return aConfigured ? 1 : -1;
  });

  return (
    <div className="flex-1 grid grid-cols-3 gap-5 auto-rows-fr">
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
