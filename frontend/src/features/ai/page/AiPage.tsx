import { useState } from 'react';
import { Plus, MoreVertical, FileText, Image, Mic, Video } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { EmptyState } from '@/components/EmptyState';
import EmptyDatabase from '@/assets/icons/empty_table.svg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/radix/DropdownMenu';
import { cn } from '@/lib/utils/utils';
import { AiConfigDialog } from '../components/AiConfigDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface AiConfiguration {
  id: string;
  modality: 'text' | 'image' | 'audio' | 'video';
  provider: string;
  model: string;
  tokenUsage: number;
  isConnected: boolean;
  systemPrompt?: string;
}

const modalityIcons = {
  text: FileText,
  image: Image,
  audio: Mic,
  video: Video,
};

const formatTokenCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export default function AiPage() {
  const [configurations, setConfigurations] = useState<AiConfiguration[]>([
    {
      id: '1',
      modality: 'text',
      provider: 'Google',
      model: 'Gemini Flash 2.5',
      tokenUsage: 1250000,
      isConnected: true,
    },
    {
      id: '2',
      modality: 'image',
      provider: 'OpenAI',
      model: 'DALL-E 3',
      tokenUsage: 85000,
      isConnected: false,
    },
    {
      id: '3',
      modality: 'text',
      provider: 'Anthropic',
      model: 'Claude 3.5 Sonnet',
      tokenUsage: 450000,
      isConnected: true,
    },
    {
      id: '4',
      modality: 'audio',
      provider: 'OpenAI',
      model: 'Whisper v3',
      tokenUsage: 32000,
      isConnected: false,
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingConfig, setEditingConfig] = useState<AiConfiguration | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    setConfigurations((prev) =>
      prev.map((config) =>
        config.id === id ? { ...config, isConnected: !config.isConnected } : config
      )
    );
  };

  const handleEdit = (id: string) => {
    const config = configurations.find((c) => c.id === id);
    if (config) {
      setEditingConfig(config);
      setDialogMode('edit');
      setDialogOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    setConfigToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (configToDelete) {
      setConfigurations((prev) => prev.filter((config) => config.id !== configToDelete));
      setConfigToDelete(null);
    }
  };

  const handleCreate = () => {
    setEditingConfig(undefined);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleDialogSuccess = (configData: Partial<AiConfiguration>) => {
    if (dialogMode === 'create') {
      const newConfig: AiConfiguration = {
        id: Date.now().toString(),
        modality: configData.modality!,
        provider: configData.provider!,
        model: configData.model!,
        systemPrompt: configData.systemPrompt,
        tokenUsage: 0,
        isConnected: false,
      };
      setConfigurations((prev) => [...prev, newConfig]);
    } else if (editingConfig) {
      setConfigurations((prev) =>
        prev.map((config) =>
          config.id === editingConfig.id ? { ...config, ...configData } : config
        )
      );
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
          {configurations.length > 0 ? (
            <div className="p-6">
              <div className="space-y-3">
                {configurations.map((config) => {
                  const Icon = modalityIcons[config.modality];

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
                          {config.provider} - {config.model}
                        </div>
                      </div>

                      {/* Token Usage */}
                      <div className="text-sm text-gray-500 dark:text-neutral-400">
                        <span className="font-medium">{formatTokenCount(config.tokenUsage)}</span>
                        {' tokens'}
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
                              onClick={() => handleDelete(config.id)}
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
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                image={EmptyDatabase}
                title="No AI Configurations"
                description="Create your first AI configuration to get started"
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Configuration Dialog */}
      <AiConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        editingConfig={editingConfig}
        onSuccess={handleDialogSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete AI Configuration"
        description="Are you sure you want to delete this AI configuration? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        destructive={true}
      />
    </div>
  );
}
