import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAIConfigs } from '../hooks/useAIConfigs';
import {
  AIConfigurationWithUsageSchema,
  createAIConfigurationRequestSchema,
  updateAIConfigurationRequestSchema,
  CreateAIConfigurationRequest,
  UpdateAIConfigurationRequest,
  ModalitySchema,
} from '@insforge/shared-schemas';
import { useToast } from '@/lib/hooks/useToast';
import { ModalityField } from './fields/ModalityField';
import { ModelSelectionField } from './fields/ModelSelectionField';
import { SystemPromptField } from './fields/SystemPromptField';

interface AIConfigFormProps {
  mode: 'create' | 'edit';
  editingConfig?: AIConfigurationWithUsageSchema;
  onSubmit: (data: CreateAIConfigurationRequest | UpdateAIConfigurationRequest) => void;
}

export function AIConfigForm({ mode, editingConfig, onSubmit }: AIConfigFormProps) {
  const { allConfiguredModels, configurations, getFilteredModels } = useAIConfigs();
  const { showToast } = useToast();
  const isCreateMode = mode === 'create';

  // State for create mode
  const [selectedInputModality, setSelectedInputModality] = useState<ModalitySchema[]>(
    isCreateMode ? ['text'] : []
  );
  const [selectedOutputModality, setSelectedOutputModality] = useState<ModalitySchema[]>(
    isCreateMode ? ['text'] : []
  );

  // Initialize form based on mode
  const getInitialValues = useCallback(():
    | CreateAIConfigurationRequest
    | UpdateAIConfigurationRequest => {
    if (isCreateMode) {
      return {
        inputModality: ['text'],
        outputModality: ['text'],
        provider: 'openrouter',
        modelId: '',
        systemPrompt: undefined,
      };
    } else {
      return {
        systemPrompt: editingConfig?.systemPrompt ?? null,
      };
    }
  }, [isCreateMode, editingConfig?.systemPrompt]);

  // Create form instances
  const createForm = useForm<CreateAIConfigurationRequest>({
    resolver: zodResolver(createAIConfigurationRequestSchema),
    defaultValues: isCreateMode ? (getInitialValues() as CreateAIConfigurationRequest) : undefined,
  });

  const editForm = useForm<UpdateAIConfigurationRequest>({
    resolver: zodResolver(updateAIConfigurationRequestSchema),
    defaultValues: !isCreateMode ? (getInitialValues() as UpdateAIConfigurationRequest) : undefined,
  });

  const form = isCreateMode ? createForm : editForm;

  // Get filtered models for create mode
  const filteredModels = useMemo(() => {
    if (!isCreateMode) {
      return [];
    }
    return getFilteredModels(selectedInputModality, selectedOutputModality);
  }, [isCreateMode, getFilteredModels, selectedInputModality, selectedOutputModality]);

  // Initialize form values
  useEffect(() => {
    const initialValues = getInitialValues();
    if (isCreateMode) {
      const createValues = initialValues as CreateAIConfigurationRequest;
      setSelectedInputModality(createValues.inputModality);
      setSelectedOutputModality(createValues.outputModality);
      createForm.reset(createValues);
    } else {
      editForm.reset(initialValues as UpdateAIConfigurationRequest);
    }
  }, [isCreateMode, getInitialValues, createForm, editForm]);

  // Reset model selection when modalities change (create mode only)
  useEffect(() => {
    if (isCreateMode) {
      createForm.setValue('modelId', '');
    }
  }, [selectedInputModality, selectedOutputModality, isCreateMode, createForm]);

  // Check if a model is already configured (create mode only)
  const isModelConfigured = useCallback(
    (modelId: string) => {
      if (!isCreateMode || !configurations) {
        return false;
      }

      return configurations.some((config) => config.modelId === modelId);
    },
    [isCreateMode, configurations]
  );

  // Check if model selection should be disabled (create mode only)
  const isModelSelectionDisabled = useMemo(() => {
    if (!isCreateMode) {
      return true;
    }
    return selectedInputModality.length === 0 || selectedOutputModality.length === 0;
  }, [isCreateMode, selectedInputModality.length, selectedOutputModality.length]);
  const selectedModelId = createForm.watch('modelId');

  const handleModelChange = useCallback(
    (modelId: string) => {
      createForm.setValue('modelId', modelId);
    },
    [createForm]
  );

  const handleFormSubmit = useCallback(
    (data: CreateAIConfigurationRequest | UpdateAIConfigurationRequest) => {
      if (isCreateMode) {
        const createData = data as CreateAIConfigurationRequest;

        // Find the selected model to get its actual architecture
        const selectedModel = allConfiguredModels.find((model) => model.id === createData.modelId);

        if (!selectedModel) {
          showToast('Selected model not found', 'error');
          return;
        }

        // Filter to only supported modalities (text and image)
        const supportedModalities: ModalitySchema[] = ['text', 'image'];
        const rawInputModality = selectedModel.architecture?.inputModalities || ['text'];
        const rawOutputModality = selectedModel.architecture?.outputModalities || ['text'];

        // Filter out unsupported modalities
        const filteredInputModality = rawInputModality.filter(
          (modality): modality is ModalitySchema =>
            supportedModalities.includes(modality as ModalitySchema)
        );
        const filteredOutputModality = rawOutputModality.filter(
          (modality): modality is ModalitySchema =>
            supportedModalities.includes(modality as ModalitySchema)
        );

        const finalCreateData: CreateAIConfigurationRequest = {
          ...createData,
          inputModality: filteredInputModality,
          outputModality: filteredOutputModality,
        };

        onSubmit(finalCreateData);
      } else {
        // Edit mode - just pass the data as is
        onSubmit(data as UpdateAIConfigurationRequest);
      }
    },
    [isCreateMode, onSubmit, allConfiguredModels, showToast]
  );

  return (
    <form
      id="ai-config-form"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit(handleFormSubmit)();
      }}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-6 w-full items-stretch">
          {isCreateMode ? (
            <>
              {/* Input modality field */}
              <ModalityField
                fieldType="input"
                value={selectedInputModality}
                onChange={setSelectedInputModality}
              />

              {/* Output modality field */}
              <ModalityField
                fieldType="output"
                value={selectedOutputModality}
                onChange={setSelectedOutputModality}
              />

              {/* Model selection field */}
              <ModelSelectionField
                models={filteredModels}
                selectedModelId={selectedModelId}
                onModelChange={handleModelChange}
                isModelConfigured={isModelConfigured}
                disabled={isModelSelectionDisabled}
              />
            </>
          ) : null}

          {/* System prompt field */}
          {isCreateMode ? (
            <SystemPromptField<CreateAIConfigurationRequest>
              register={createForm.register}
              error={createForm.formState.errors.systemPrompt}
            />
          ) : (
            <SystemPromptField<UpdateAIConfigurationRequest>
              register={editForm.register}
              error={editForm.formState.errors.systemPrompt}
            />
          )}
        </div>
      </div>
    </form>
  );
}
