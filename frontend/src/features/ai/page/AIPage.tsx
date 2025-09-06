import { useState } from 'react';
import { Plus, MoreVertical, FileText, Image, Mic, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { EmptyState } from '@/components/EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/radix/DropdownMenu';
import { cn } from '@/lib/utils/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PromptDialog } from '@/components/PromptDialog';
import { useAIConfigs } from '../hooks/useAIConfigs';
import {
  AIConfigurationWithUsageSchema,
  CreateAIConfigurationRequest,
  UpdateAIConfigurationRequest,
} from '@insforge/shared-schemas';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { AIConfigDialog } from '@/features/ai/components/AIConfigDialog';
import { generateAIIntegrationPrompt } from '@/features/ai/helpers';

const getModalityIcon = (modality: string) => {
  switch (modality) {
    case 'text':
      return FileText;
    case 'image':
      return Image;
    case 'audio':
      return Mic;
    case 'video':
      return Video;
    default:
      return FileText; // Default fallback icon
  }
};

const formatTokenCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export default function AIPage() {
  const {
    configurations,
    isLoadingConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
  } = useAIConfigs();

  const { confirm, confirmDialogProps } = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingConfig, setEditingConfig] = useState<AIConfigurationWithUsageSchema | undefined>();
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [selectedConfigForPrompt, setSelectedConfigForPrompt] =
    useState<AIConfigurationWithUsageSchema | null>(null);

  const handleConnect = (id: string) => {
    const config = configurations.find((c) => c.id === id);
    if (config) {
      setSelectedConfigForPrompt(config);
      setPromptDialogOpen(true);
    }
  };

  const handleEdit = (id: string) => {
    const config = configurations.find((c) => c.id === id);
    if (config) {
      setEditingConfig(config);
      setDialogMode('edit');
      setDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const config = configurations.find((c) => c.id === id);
    const shouldDelete = await confirm({
      title: 'Delete AI Configuration',
      description: `Are you sure you want to delete the configuration "${config?.provider} - ${config?.modelId}"? This action cannot be undone.`,
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
        modality: createData.modality,
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
    <div className="flex h-full bg-bg-gray dark:bg-neutral-800">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="border-b border-gray-200 dark:border-neutral-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-black dark:text-white">
                AI Configurations
              </h1>
              <Button
                className="h-10 px-4 font-medium gap-1.5 dark:bg-emerald-300 dark:hover:bg-emerald-400"
                onClick={handleCreate}
              >
                <Plus className="w-5 h-5" />
                Create
              </Button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-auto">
          {isLoadingConfigurations ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : configurations.length > 0 ? (
            <div className="p-6">
              <div className="space-y-3">
                {configurations.map((config) => {
                  const Icon = getModalityIcon(config.modality);

                  return (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        {/* Modality Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-neutral-800">
                          <Icon className="w-5 h-5 text-gray-600 dark:text-neutral-400" />
                        </div>

                        {/* Provider and Model */}
                        <div className="w-80 font-medium text-black dark:text-white">
                          {config.provider} - {config.modelId}
                        </div>
                      </div>

                      {/* Usage Statistics */}
                      <div className="text-sm text-gray-500 dark:text-neutral-400">
                        {config.usageStats ? (
                          <div className="flex items-center gap-4">
                            {config.modality === 'image' ? (
                              <>
                                <span>
                                  <span className="font-medium">
                                    {config.usageStats.totalImageCount}
                                  </span>
                                  {config.usageStats.totalImageCount === 1 ? ' image' : ' images'}
                                </span>
                                {config.usageStats.totalTokens > 0 && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span>
                                      <span className="font-medium">
                                        {formatTokenCount(config.usageStats.totalTokens)}
                                      </span>
                                      {' tokens'}
                                    </span>
                                  </>
                                )}
                                <span className="text-gray-400">•</span>
                                <span>
                                  <span className="font-medium">
                                    {config.usageStats.totalRequests}
                                  </span>
                                  {config.usageStats.totalRequests === 1 ? ' request' : ' requests'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>
                                  <span className="font-medium">
                                    {formatTokenCount(config.usageStats.totalTokens)}
                                  </span>
                                  {' tokens'}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span>
                                  <span className="font-medium">
                                    {config.usageStats.totalRequests}
                                  </span>
                                  {config.usageStats.totalRequests === 1 ? ' request' : ' requests'}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No usage yet</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className={cn(
                            'h-9 px-4',
                            'dark:bg-emerald-300 dark:hover:bg-emerald-400'
                          )}
                          onClick={() => handleConnect(config.id)}
                        >
                          Connect
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                              <MoreVertical className="h-4 w-4 text-gray-500 dark:text-neutral-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(config.id)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void handleDelete(config.id)}
                              className="text-red-600 dark:text-red-400"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex-1 flex items-center justify-center">
              <EmptyState
                title="No AI Configurations"
                description="Create your first AI configuration to get started"
              />
            </div>
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

      {/* Prompt Dialog */}
      <PromptDialog
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
        prompt={selectedConfigForPrompt ? generateAIIntegrationPrompt(selectedConfigForPrompt) : ''}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
