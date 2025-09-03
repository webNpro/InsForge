import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useAIConfigurations } from '../hooks/useAIConfigurations';

interface AiConfiguration {
  id: string;
  modality: 'text' | 'image' | 'audio' | 'video';
  provider: string;
  model: string;
  systemPrompt?: string;
  tokenUsage: number;
  isConnected: boolean;
}

interface AiConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  editingConfig?: AiConfiguration;
  onSuccess?: (config: Partial<AiConfiguration>) => void;
}

const formSchema = z.object({
  modality: z.enum(['text', 'image', 'audio', 'video']),
  model: z.string().min(1, 'Model is required'),
  systemPrompt: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function AiConfigDialog({
  open,
  onOpenChange,
  mode,
  editingConfig,
  onSuccess,
}: AiConfigDialogProps) {
  const { configuredTextProviders, configuredImageProviders } = useAIConfigurations();

  const [selectedModality, setSelectedModality] = useState<'text' | 'image' | 'audio' | 'video'>(
    editingConfig?.modality || 'text'
  );

  // Build models list from configured providers only
  const modelsByModality = useMemo(() => {
    const models: Record<string, Array<{ value: string; label: string; provider: string }>> = {
      text: [],
      image: [],
      audio: [],
      video: [],
    };

    // Add text models from configured providers
    configuredTextProviders.forEach((provider) => {
      provider.models.forEach((model) => {
        models.text.push({
          value: `${provider.provider}-${model}`,
          label: `${provider.provider} - ${model}`,
          provider: provider.provider,
        });
      });
    });

    // Add image models from configured providers
    configuredImageProviders.forEach((provider) => {
      provider.models.forEach((model) => {
        models.image.push({
          value: `${provider.provider}-${model}`,
          label: `${provider.provider} - ${model}`,
          provider: provider.provider,
        });
      });
    });

    return models;
  }, [configuredTextProviders, configuredImageProviders]);

  // Determine available modalities based on configured providers
  const modalityOptions = useMemo(() => {
    const options = [];
    if (configuredTextProviders.length > 0) {
      options.push({ value: 'text', label: 'Text' });
    }
    if (configuredImageProviders.length > 0) {
      options.push({ value: 'image', label: 'Image' });
    }
    // Add audio and video if they become available in the API
    // For now, we'll keep them disabled
    return options;
  }, [configuredTextProviders, configuredImageProviders]);

  // Calculate initial values based on editing config and available providers
  const initialValues = useMemo(() => {
    if (editingConfig) {
      const modality = editingConfig.modality as 'text' | 'image' | 'audio' | 'video';
      const modelValue =
        modelsByModality[modality]?.find(
          (m) => m.label.includes(editingConfig.model) && m.provider === editingConfig.provider
        )?.value || '';

      return {
        modality: editingConfig.modality,
        model: modelValue,
        systemPrompt: editingConfig.systemPrompt || '',
      };
    } else {
      // Set default modality to the first available one
      const defaultModality =
        configuredTextProviders.length > 0
          ? 'text'
          : configuredImageProviders.length > 0
            ? 'image'
            : 'text';

      return {
        modality: defaultModality as 'text' | 'image' | 'audio' | 'video',
        model: '',
        systemPrompt: '',
      };
    }
  }, [editingConfig, modelsByModality, configuredTextProviders, configuredImageProviders]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // Reset form when dialog opens with proper initial values
  useEffect(() => {
    if (open) {
      setSelectedModality(editingConfig?.modality || initialValues.modality);
      form.reset(initialValues);
    }
  }, [open, editingConfig, initialValues, form]);

  const handleModalityChange = (value: string) => {
    const modality = value as 'text' | 'image' | 'audio' | 'video';
    setSelectedModality(modality);
    form.setValue('modality', modality);
    form.setValue('model', '');
  };

  const handleSubmit = (data: FormData) => {
    const selectedModelOption = modelsByModality[data.modality].find((m) => m.value === data.model);

    if (onSuccess && selectedModelOption) {
      onSuccess({
        modality: data.modality,
        model: selectedModelOption.label.split(' - ')[1],
        provider: selectedModelOption.provider,
        systemPrompt: data.systemPrompt || undefined,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  const availableModels = modelsByModality[selectedModality];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-zinc-200 dark:border-neutral-700 dark:bg-neutral-900 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
        <form onSubmit={() => void form.handleSubmit(handleSubmit)} className="flex flex-col">
          <DialogHeader className="px-6 py-3 flex flex-col gap-1 justify-start border-b border-zinc-200 dark:border-neutral-700">
            <DialogTitle className="text-lg font-semibold text-zinc-950 dark:text-white">
              {mode === 'create' ? 'Create AI Configuration' : 'Edit AI Configuration'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 p-6">
            {modalityOptions.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
                No AI providers are configured. Please configure at least one provider to create AI
                configurations.
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <div className="flex flex-col flex-1 space-y-2">
                    <Label className="text-sm font-medium text-zinc-950 dark:text-zinc-300">
                      Output
                    </Label>
                    <Select value={form.watch('modality')} onValueChange={handleModalityChange}>
                      <SelectTrigger
                        id="modality"
                        className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                      >
                        <SelectValue placeholder="Select modality" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-neutral-800 dark:border-neutral-700">
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
                    {form.formState.errors.modality && (
                      <p className="text-sm text-red-600 dark:text-red-500">
                        {form.formState.errors.modality.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 space-y-2">
                    <Label className="text-sm font-medium text-zinc-950 dark:text-zinc-300">
                      AI Model
                    </Label>
                    <Select
                      value={form.watch('model')}
                      onValueChange={(value) => form.setValue('model', value)}
                      disabled={availableModels.length === 0}
                    >
                      <SelectTrigger
                        id="model"
                        className="w-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                      >
                        <SelectValue
                          placeholder={
                            availableModels.length === 0 ? 'No models available' : 'Select model'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-neutral-800 dark:border-neutral-700">
                        {availableModels.length === 0 ? (
                          <SelectItem value="no-models" disabled className="dark:text-zinc-400">
                            No models available for this modality
                          </SelectItem>
                        ) : (
                          availableModels.map((model) => (
                            <SelectItem
                              key={model.value}
                              value={model.value}
                              className="dark:text-white dark:hover:bg-neutral-700"
                            >
                              {model.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.model && (
                      <p className="text-sm text-red-600 dark:text-red-500">
                        {form.formState.errors.model.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label
                    htmlFor="systemPrompt"
                    className="text-sm font-medium text-zinc-950 dark:text-zinc-300"
                  >
                    System Prompt{' '}
                    <span className="text-sm text-gray-500 dark:text-neutral-400">(Optional)</span>
                  </Label>
                  <Textarea
                    id="systemPrompt"
                    {...form.register('systemPrompt')}
                    placeholder="Enter system prompt..."
                    className="min-h-[100px] resize-none dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-400 dark:border-neutral-700"
                  />
                  {form.formState.errors.systemPrompt && (
                    <p className="text-sm text-red-600 dark:text-red-500">
                      {form.formState.errors.systemPrompt.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-6 gap-3 border-t border-zinc-200 dark:border-neutral-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                form.reset();
              }}
              className="w-30 h-9 px-3 py-2 text-sm font-medium dark:bg-neutral-600 dark:text-zinc-300 dark:border-neutral-600 dark:hover:bg-neutral-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={modalityOptions.length === 0}
              className="w-30 h-9 px-3 py-2 text-sm font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-emerald-300 dark:text-zinc-950 dark:hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
