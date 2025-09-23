import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAIConfigs } from '../hooks/useAIConfigs';
import { useAIRemainingCredits } from '../hooks/useAIUsage';
import {
  AIConfigurationWithUsageSchema,
  CreateAIConfigurationRequest,
  UpdateAIConfigurationRequest,
} from '@insforge/shared-schemas';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { AIConfigDialog } from '@/features/ai/components/AIConfigDialog';
import { AIModelCard } from '@/features/ai/components/AIConfigCard';
import AIEmptyState from '@/features/ai/components/AIEmptyState';
import { getProviderLogo } from '../helpers';

export default function AIPage() {
  const {
    configurations,
    isLoadingConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    anonKey,
  } = useAIConfigs();

  const { data: credits } = useAIRemainingCredits();

  const { confirm, confirmDialogProps } = useConfirm();

  // Format credits display
  const formatCredits = (remaining: number) => {
    if (remaining >= 1000) {
      return `${(remaining / 1000).toFixed(1)}K`;
    }
    return remaining.toFixed(2);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingConfig, setEditingConfig] = useState<AIConfigurationWithUsageSchema | undefined>();

  const handleEdit = (id: string) => {
    const config = configurations.find((c) => c.id === id);
    if (config) {
      setEditingConfig(config);
      setDialogMode('edit');
      setDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Delete AI Configuration',
      description:
        'Are you certain you wish to remove this AI Integration? This action is irreversible.',
      confirmText: 'Delete',
      destructive: true,
    });

    if (shouldDelete) {
      deleteConfiguration(id);
    }
  };

  const handleCreate = () => {
    setEditingConfig(undefined);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleDialogSuccess = (
    configData: CreateAIConfigurationRequest | UpdateAIConfigurationRequest
  ) => {
    if (dialogMode === 'create') {
      const createData = configData as CreateAIConfigurationRequest;
      createConfiguration({
        inputModality: createData.inputModality,
        outputModality: createData.outputModality,
        provider: createData.provider,
        modelId: createData.modelId,
        systemPrompt: createData.systemPrompt,
      });
    } else if (editingConfig) {
      const updateData = configData as UpdateAIConfigurationRequest;
      updateConfiguration({
        id: editingConfig.id,
        data: {
          systemPrompt: updateData.systemPrompt || null,
        },
      });
    }
    setDialogOpen(false);
  };

  return (
    <div className="flex h-full bg-bg-gray dark:bg-neutral-800 pt-8 pb-6">
      <div className="max-w-[1080px] mx-auto flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Header Section */}
        <div className="w-full flex items-start justify-between">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-black dark:text-white">AI Integration</h1>
              {credits?.remaining && (
                <span className="text-sm font-normal text-emerald-500 dark:text-emerald-400 mt-[2.5px]">
                  {formatCredits(credits.remaining)} credit{credits.remaining !== 1 ? 's' : ''} left
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Copy prompt to your agent and the AI Model below will be integrated automatically.
            </p>
          </div>
          <Button
            className="h-9 py-2 pl-2 pr-3 text-sm font-medium gap-2 dark:text-white dark:bg-neutral-700 dark:hover:bg-neutral-600"
            onClick={handleCreate}
          >
            <Plus className="w-5 h-5" />
            New Integration
          </Button>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-auto">
          {isLoadingConfigurations ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : configurations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {configurations.map((config) => {
                const providerLogo = getProviderLogo(config.modelId.split('/')[0]);
                const extendedConfig = {
                  ...config,
                  logo: providerLogo,
                };

                return (
                  <AIModelCard
                    key={config.id}
                    config={extendedConfig}
                    anonKey={anonKey}
                    onEdit={handleEdit}
                    onDelete={() => void handleDelete(config.id)}
                  />
                );
              })}
            </div>
          ) : (
            <AIEmptyState />
          )}
        </div>
      </div>

      {/* AI Configuration Dialog */}
      <AIConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        editingConfig={editingConfig}
        onSuccess={handleDialogSuccess}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
