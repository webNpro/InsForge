import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/radix/Dialog';
import { Button } from '@/components/radix/Button';
import { Label } from '@/components/radix/Label';
import { Textarea } from '@/components/radix/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/radix/Select';
import { useAIConfigs } from '../hooks/useAIConfigs';
import {
  AIConfigurationWithUsageSchema,
  createAIConfigurationRequestSchema,
  updateAIConfigurationRequestSchema,
  CreateAIConfigurationRequest,
  UpdateAIConfigurationRequest,
  ModalitySchema,
} from '@insforge/shared-schemas';

interface AIConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  editingConfig?: AIConfigurationWithUsageSchema;
  onSuccess?: (config: CreateAIConfigurationRequest | UpdateAIConfigurationRequest) => void;
}

interface ModelOption {
  value: string;
  label: string;
}

interface ModalityOption {
  value: ModalitySchema;
  label: string;
}

export function AIConfigDialog({
  open,
  onOpenChange,
  mode,
  editingConfig,
  onSuccess,
}: AIConfigDialogProps) {
  const { configuredTextProviders, configuredImageProviders, configurations } = useAIConfigs();
  const [selectedModality, setSelectedModality] = useState<ModalitySchema>('text');

  const modelsByModality = useMemo(() => {
    const models: Record<ModalitySchema, ModelOption[]> = {
      text: [],
      image: [],
      audio: [],
      video: [],
      multi: [],
    };

    // Text models
    configuredTextProviders.forEach((provider) => {
      if (provider.configured) {
        provider.models.forEach((model) => {
          models.text.push({
            value: model.id,
            label: model.name,
          });
        });
      }
    });

    // Image models
    configuredImageProviders.forEach((provider) => {
      if (provider.configured) {
        provider.models.forEach((model) => {
          models.image.push({
            value: model.id,
            label: model.name,
          });
        });
      }
    });

    // Sort all model arrays by model id (value)
    Object.keys(models).forEach((modality) => {
      models[modality as ModalitySchema].sort((a, b) => a.value.localeCompare(b.value));
    });

    return models;
  }, [configuredTextProviders, configuredImageProviders]);

  const modalityOptions = useMemo((): ModalityOption[] => {
    const options: ModalityOption[] = [];

    // Check if OpenRouter is configured and has models
    const hasTextModels = configuredTextProviders.some((p) => p.configured && p.models.length > 0);

    const hasImageModels = configuredImageProviders.some(
      (p) => p.configured && p.models.length > 0
    );

    if (hasTextModels) {
      options.push({ value: 'text', label: 'Text' });
    }
    if (hasImageModels) {
      options.push({ value: 'image', label: 'Image' });
    }

    return options;
  }, [configuredTextProviders, configuredImageProviders]);

  const hasModel = modalityOptions.length > 0;

  const getDefaultModality = useCallback((): ModalitySchema => {
    if (modalityOptions.length > 0) {
      return modalityOptions[0].value;
    }
    return 'text';
  }, [modalityOptions]);

  const getInitialCreateValues = useCallback((): CreateAIConfigurationRequest => {
    if (editingConfig && mode === 'create') {
      return {
        modality: editingConfig.modality,
        provider: 'openrouter', // Always OpenRouter now
        modelId: editingConfig.modelId,
        systemPrompt: editingConfig.systemPrompt,
      };
    }

    return {
      modality: getDefaultModality(),
      provider: 'openrouter', // Always OpenRouter now
      modelId: '',
      systemPrompt: undefined,
    };
  }, [mode, editingConfig, getDefaultModality]);

  const getInitialEditValues = useCallback((): UpdateAIConfigurationRequest => {
    return {
      systemPrompt: editingConfig?.systemPrompt ?? null,
    };
  }, [editingConfig]);

  const createForm = useForm<CreateAIConfigurationRequest>({
    resolver: zodResolver(createAIConfigurationRequestSchema),
    defaultValues: getInitialCreateValues(),
  });

  const editForm = useForm<UpdateAIConfigurationRequest>({
    resolver: zodResolver(updateAIConfigurationRequestSchema),
    defaultValues: getInitialEditValues(),
  });

  const form = mode === 'edit' ? editForm : createForm;
  const isCreateMode = mode === 'create';

  useEffect(() => {
    if (open) {
      if (isCreateMode) {
        const initialValues = getInitialCreateValues();
        const modality = editingConfig?.modality || initialValues.modality;
        setSelectedModality(modality);
        createForm.reset(initialValues);
      } else {
        const initialValues = getInitialEditValues();
        const modality = editingConfig?.modality || 'text';
        setSelectedModality(modality);
        editForm.reset(initialValues);
      }
    }
  }, [
    open,
    editingConfig,
    getInitialCreateValues,
    getInitialEditValues,
    createForm,
    editForm,
    isCreateMode,
  ]);

  const handleModalityChange = useCallback(
    (value: string) => {
      const modality = value as ModalitySchema;
      setSelectedModality(modality);
      if (isCreateMode) {
        createForm.setValue('modality', modality);
        // Clear the model selection when modality changes
        createForm.setValue('modelId', '');
        // Force the form to update by triggering validation
        void createForm.trigger('modelId');
      }
    },
    [createForm, isCreateMode]
  );

  const handleEditSubmit = useCallback(
    (data: UpdateAIConfigurationRequest) => {
      onSuccess?.({
        systemPrompt: data.systemPrompt,
      });
    },
    [onSuccess]
  );

  const handleCreateSubmit = useCallback(
    (data: CreateAIConfigurationRequest) => {
      onSuccess?.({
        modality: data.modality,
        modelId: data.modelId,
        provider: 'openrouter', // Always OpenRouter now
        systemPrompt: data.systemPrompt,
      });
    },
    [onSuccess]
  );

  const onFormSubmit = useCallback(
    (data: CreateAIConfigurationRequest | UpdateAIConfigurationRequest) => {
      if (mode === 'edit') {
        handleEditSubmit(data as UpdateAIConfigurationRequest);
      } else {
        handleCreateSubmit(data as CreateAIConfigurationRequest);
      }
      onOpenChange(false);
      form.reset();
    },
    [mode, handleEditSubmit, handleCreateSubmit, onOpenChange, form]
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    form.reset();
  }, [onOpenChange, form]);

  const availableModels = modelsByModality[selectedModality];

  // Check if a model is already configured
  const isModelConfigured = useCallback(
    (modelId: string) => {
      if (!configurations) {
        return false;
      }

      // When editing, exclude the current config from the check
      return configurations.some(
        (config) => config.modelId === modelId && (!editingConfig || config.id !== editingConfig.id)
      );
    },
    [configurations, editingConfig]
  );

  const renderModalityField = () => {
    if (!isCreateMode) {
      return (
        <div className="flex flex-col flex-1 space-y-2">
          <Label className="text-sm font-medium text-zinc-950 dark:text-zinc-300">Output</Label>
          <div className="flex items-center h-9 px-3 py-2 text-sm bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-700 rounded-md text-zinc-600 dark:text-zinc-400">
            {editingConfig?.modality || 'N/A'}
          </div>
        </div>
      );
    }

    const modality = createForm.watch('modality');
    const modalityError = createForm.formState.errors.modality;

    return (
      <div className="flex flex-col flex-1 space-y-2">
        <Label className="text-sm font-medium text-zinc-950 dark:text-zinc-300">Output</Label>
        <Select value={modality || ''} onValueChange={handleModalityChange}>
          <SelectTrigger
            id="modality"
            className="h-9 bg-transparent dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
          >
            <SelectValue placeholder="Select modality" />
          </SelectTrigger>
          <SelectContent className="dark:bg-neutral-900 dark:border-neutral-700">
            {modalityOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="dark:text-white dark:hover:bg-neutral-700"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {modalityError && (
          <p className="text-sm text-red-600 dark:text-red-500">{modalityError.message}</p>
        )}
      </div>
    );
  };

  const renderModelField = () => {
    if (!isCreateMode) {
      return (
        <div className="flex flex-col flex-1 space-y-2">
          <Label className="text-sm font-medium text-zinc-950 dark:text-zinc-300">AI Model</Label>
          <div className="w-100 flex items-center h-9 px-3 py-2 text-sm bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-700 rounded-md text-zinc-600 dark:text-zinc-400">
            {editingConfig?.modelId}
          </div>
        </div>
      );
    }

    const modelId = createForm.watch('modelId');
    const modelError = createForm.formState.errors.modelId;
    const hasModels = availableModels.length > 0;

    return (
      <div className="flex flex-col flex-1 space-y-2">
        <Label className="text-sm font-medium text-zinc-950 dark:text-zinc-300">AI Model</Label>
        <Select
          key={selectedModality}
          value={modelId || ''}
          onValueChange={(value) => {
            createForm.setValue('modelId', value);
            // Provider is always OpenRouter now
            createForm.setValue('provider', 'openrouter');
          }}
          disabled={!hasModels}
        >
          <SelectTrigger
            id="model"
            className="w-100 h-9 bg-transparent dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
          >
            <SelectValue placeholder={hasModels ? 'Select model' : 'No models available'} />
          </SelectTrigger>
          <SelectContent className="dark:bg-neutral-900 dark:border-neutral-700">
            {hasModels ? (
              availableModels.map((modelOption) => {
                const isConfigured = isModelConfigured(modelOption.value);
                return (
                  <SelectItem
                    key={modelOption.value}
                    value={modelOption.value}
                    disabled={isConfigured}
                    className={
                      isConfigured
                        ? 'dark:text-zinc-500 text-zinc-400 cursor-not-allowed'
                        : 'dark:text-white dark:hover:bg-neutral-700'
                    }
                  >
                    {modelOption.label}
                    {isConfigured && ' (Already configured)'}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-models" disabled className="dark:text-zinc-400">
                No models available for this modality
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {modelError && (
          <p className="text-sm text-red-600 dark:text-red-500">{modelError.message}</p>
        )}
      </div>
    );
  };

  const renderSystemPromptField = () => {
    const systemPromptRegister = isCreateMode
      ? createForm.register('systemPrompt')
      : editForm.register('systemPrompt');
    const systemPromptError = form.formState.errors.systemPrompt;

    return (
      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="systemPrompt"
          className="text-sm font-medium text-zinc-950 dark:text-zinc-300"
        >
          System Prompt{' '}
          <span className="text-sm text-zinc-500 dark:text-neutral-400">(Optional)</span>
        </Label>
        <Textarea
          id="systemPrompt"
          {...systemPromptRegister}
          placeholder="Enter system prompt..."
          className="min-h-[100px] resize-none bg-transparent dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-400 dark:border-neutral-700"
        />
        {systemPromptError && (
          <p className="text-sm text-red-600 dark:text-red-500">{systemPromptError.message}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[560px] p-0 border-zinc-200 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(onFormSubmit)();
          }}
          className="flex flex-col"
        >
          <DialogHeader className="px-6 py-3 flex flex-col gap-1 justify-start border-b border-zinc-200 dark:border-neutral-700">
            <DialogTitle className="text-lg font-semibold text-zinc-950 dark:text-white">
              {isCreateMode ? 'Create AI Configuration' : 'Edit AI Configuration'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 p-6">
            {!hasModel ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
                No AI models available. Please configure your OpenRouter API key to access AI
                models.
              </div>
            ) : (
              <>
                <div className="flex gap-4">
                  {renderModalityField()}
                  {renderModelField()}
                </div>
                {renderSystemPromptField()}
              </>
            )}
          </div>

          <DialogFooter className="p-6 gap-3 border-t border-zinc-200 dark:border-neutral-700">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-30 h-9 px-3 py-2 text-sm font-medium dark:bg-neutral-600 dark:text-zinc-300 dark:border-neutral-600 dark:hover:bg-neutral-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasModel}
              className="w-30 h-9 px-3 py-2 text-sm font-medium bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-emerald-300 dark:text-zinc-950 dark:hover:bg-emerald-400"
            >
              {isCreateMode ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
