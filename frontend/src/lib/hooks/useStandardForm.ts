import { useState } from 'react';
import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';

export interface UseStandardFormOptions<T extends FieldValues>
  extends Omit<UseFormProps<T>, 'resolver'> {
  schema: ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (error: Error) => void;
}

export interface UseStandardFormReturn<T extends FieldValues> extends UseFormReturn<T> {
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  clearError: () => void;
}

export function useStandardForm<T extends FieldValues>({
  schema,
  onSubmit,
  onError,
  ...formOptions
}: UseStandardFormOptions<T>): UseStandardFormReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<T>({
    ...formOptions,
    resolver: zodResolver(schema),
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setSubmitError(errorMessage);

      // Set form-level error
      form.setError('root', {
        type: 'manual',
        message: errorMessage,
      });

      // Call error callback if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  const clearError = () => {
    setSubmitError(null);
    form.clearErrors('root');
  };

  return {
    ...form,
    isSubmitting,
    submitError,
    onSubmit: handleSubmit,
    clearError,
  };
}
