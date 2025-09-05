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
  provider: string;
}

interface ModalityOption {
  value: string;
  label: string;
}

const buildModelKey = (provider: string, model: string): string => `${provider}-${model}`;

const parseModelKey = (key: string): { provider: string; model: string } => {
  const [provider, ...modelParts] = key.split('-');
  return { provider, model: modelParts.join('-') };
};

const buildModelLabel = (provider: string, model: string): string => `${provider} - ${model}`;

export function AIConfigDialog({
  open,
  onOpenChange,
  mode,
  editingConfig,
  onSuccess,
}: AIConfigDialogProps) {
  const { configuredTextProviders, configuredImageProviders } = useAIConfigs();
  const [selectedModality, setSelectedModality] = useState<ModalitySchema>('text');

  const modelsByModality = useMemo(() => {
    const models: Record<ModalitySchema, ModelOption[]> = {
      text: [],
      image: [],
      audio: [],
      video: [],
      multi: [],
    };

    configuredTextProviders.forEach((provider) => {
      provider.models.forEach((model) => {
        models.text.push({
          value: buildModelKey(provider.provider, model),
          label: buildModelLabel(provider.provider, model),
          provider: provider.provider,
        });
      });
    });

    configuredImageProviders.forEach((provider) => {
      provider.models.forEach((model) => {
        models.image.push({
          value: buildModelKey(provider.provider, model),
          label: buildModelLabel(provider.provider, model),
          provider: provider.provider,
        });
      });
    });

    return models;
  }, [configuredTextProviders, configuredImageProviders]);

  const modalityOptions = useMemo((): ModalityOption[] => {
    const options: ModalityOption[] = [];
    console.log(configuredTextProviders);
    console.log(configuredImageProviders);
    if (configuredTextProviders.length > 0) {
      options.push({ value: 'text', label: 'Text' });
    }
    if (configuredImageProviders.length > 0) {
      options.push({ value: 'image', label: 'Image' });
    }
    return options;
  }, [configuredTextProviders, configuredImageProviders]);

  const hasProviders = modalityOptions.length > 0;

  const getDefaultModality = useCallback((): ModalitySchema => {
    if (configuredTextProviders.length > 0) {
      return 'text';
    }
    if (configuredImageProviders.length > 0) {
      return 'image';
    }
    return 'text';
  }, [configuredTextProviders, configuredImageProviders]);

  const findModelValue = useCallback(
    (modality: ModalitySchema, model: string, provider: string): string => {
      const modelOption = modelsByModality[modality]?.find(
        (m) => m.label.includes(model) && m.provider === provider
      );
      return modelOption?.value ?? '';
    },
    [modelsByModality]
  );

  const getInitialCreateValues = useCallback((): CreateAIConfigurationRequest => {
    if (editingConfig && mode === 'create') {
      const modality = editingConfig.modality as ModalitySchema;
      return {
        modality,
        provider: editingConfig.provider,
        model: findModelValue(modality, editingConfig.model, editingConfig.provider),
        systemPrompt: editingConfig.systemPrompt,
      };
    }

    return {
      modality: getDefaultModality(),
      provider: '',
      model: '',
      systemPrompt: undefined,
    };
  }, [mode, editingConfig, findModelValue, getDefaultModality]);

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
        setSelectedModality(modality as ModalitySchema);
        createForm.reset(initialValues);
      } else {
        const initialValues = getInitialEditValues();
        const modality = editingConfig?.modality || 'text';
        setSelectedModality(modality as ModalitySchema);
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
        createForm.setValue('model', '');
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
      const selectedModelOption = modelsByModality[data.modality].find(
        (m) => m.value === data.model
      );

      if (selectedModelOption) {
        const { model } = parseModelKey(selectedModelOption.value);
        onSuccess?.({
          modality: data.modality,
          model,
          provider: selectedModelOption.provider,
          systemPrompt: data.systemPrompt,
        });
      }
    },
    [modelsByModality, onSuccess]
  );

  const handleSubmit = useCallback(
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
        <Select value={modality || undefined} onValueChange={handleModalityChange}>
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
            {editingConfig?.provider} - {editingConfig?.model}
          </div>
        </div>
      );
    }

    const model = createForm.watch('model');
    const modelError = createForm.formState.errors.model;
    const hasModels = availableModels.length > 0;

    return (
      <div className="flex flex-col flex-1 space-y-2">
        <Label className="text-sm font-medium text-zinc-950 dark:text-zinc-300">AI Model</Label>
        <Select
          value={model || undefined}
          onValueChange={(value) => {
            createForm.setValue('model', value);
            const selectedModel = availableModels.find((m) => m.value === value);
            if (selectedModel) {
              createForm.setValue('provider', selectedModel.provider);
            }
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
              availableModels.map((modelOption) => (
                <SelectItem
                  key={modelOption.value}
                  value={modelOption.value}
                  className="dark:text-white dark:hover:bg-neutral-700"
                >
                  {modelOption.label}
                </SelectItem>
              ))
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
            void form.handleSubmit(handleSubmit)();
          }}
          className="flex flex-col"
        >
          <DialogHeader className="px-6 py-3 flex flex-col gap-1 justify-start border-b border-zinc-200 dark:border-neutral-700">
            <DialogTitle className="text-lg font-semibold text-zinc-950 dark:text-white">
              {isCreateMode ? 'Create AI Configuration' : 'Edit AI Configuration'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 p-6">
            {!hasProviders ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
                No AI providers are configured. Please configure at least one provider to create AI
                configurations.
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
              disabled={!hasProviders}
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
