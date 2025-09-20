import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { Input } from '@/components/radix/Input';
import { Switch } from '@/components/radix/Switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/radix/Dialog';
import WarningIcon from '@/assets/icons/warning.svg';
import { configService } from '@/features/auth/services/config.service';
import { useToast } from '@/lib/hooks/useToast';
import { CopyButton } from '@/components/CopyButton';
import { oAuthConfigSchema, OAuthConfigSchema } from '@insforge/shared-schemas';
import { OAuthProviderInfo } from './OAuthConfiguration';

const getCallbackUrl = (provider?: string) => {
  // Use backend API URL for OAuth callback
  return `${window.location.origin}/api/auth/oauth/${provider}/callback`;
};

interface OAuthMethodDialogProps {
  provider?: OAuthProviderInfo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function OAuthMethodDialog({
  provider,
  isOpen,
  onClose,
  onSuccess,
}: OAuthMethodDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const form = useForm<OAuthConfigSchema>({
    resolver: zodResolver(oAuthConfigSchema),
    defaultValues: {
      google: {
        clientId: '',
        clientSecret: '',
        redirectUri: getCallbackUrl('google'),
        enabled: false,
        useSharedKeys: false,
      },
      github: {
        clientId: '',
        clientSecret: '',
        redirectUri: getCallbackUrl('github'),
        enabled: false,
        useSharedKeys: false,
      },
    },
  });

  const currentProviderKey = provider?.id || 'google';
  const useSharedKeys = form.watch(`${currentProviderKey}.useSharedKeys`);
  const clientId = form.watch(`${currentProviderKey}.clientId`);
  const clientSecret = form.watch(`${currentProviderKey}.clientSecret`);

  // Use useFormState hook for better reactivity
  const { isDirty } = useFormState({
    control: form.control,
  });

  const loadOAuthConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await configService.getOAuthConfig();
      form.reset(config);
    } catch (error) {
      const errorMessage = 'Failed to load OAuth configuration';
      showToast(errorMessage, 'error');
      console.error('Error loading OAuth config:', error);
    } finally {
      setLoading(false);
    }
  }, [form, showToast]);

  // Load OAuth configuration when dialog opens
  useEffect(() => {
    if (isOpen && provider) {
      void loadOAuthConfig();
    }
  }, [isOpen, provider, loadOAuthConfig]);

  const handleSubmitData = async (data: OAuthConfigSchema) => {
    if (!provider) {
      return;
    }

    try {
      setSaving(true);

      // Create updated config and enable the OAuth method
      const updatedConfig = {
        ...data,
        [currentProviderKey]: {
          ...data[currentProviderKey],
          useSharedKeys: useSharedKeys ?? true,
          enabled: true, // Enable the provider when configuration is saved
        },
      };

      // Update OAuth configuration and enable the provider
      await configService.updateOAuthConfig(updatedConfig);
      await configService.reloadOAuthConfig();

      showToast(`${provider.name} added successfully!`, 'success');

      // Reset form state to mark as clean (not dirty)
      form.reset(updatedConfig);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      // Close dialog
      onClose();
    } catch (error) {
      const errorMessage = `Failed to update ${provider.name} configuration. Please check running environment and try again.`;
      showToast(errorMessage, 'error');
      console.error('Error saving OAuth config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    void handleSubmitData(form.getValues() as OAuthConfigSchema);
  };

  // Use RHF's built-in validation and dirty state
  const isUpdateDisabled = () => {
    if (saving || !isDirty) {
      return true;
    }

    // If using shared keys, always allow (no credential validation needed)
    if (useSharedKeys) {
      return false;
    }

    // If NOT using shared keys, require both clientId and clientSecret
    return !clientId || !clientSecret;
  };

  return (
    <Dialog open={isOpen && !!provider} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[700px] dark:bg-neutral-800 dark:text-white p-0 gap-0">
        <DialogHeader className="px-6 py-3 border-b border-zinc-200 dark:border-neutral-700">
          <DialogTitle>{provider?.name}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-zinc-400">
                Loading OAuth configuration...
              </div>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col">
              <div className="space-y-6 p-6">
                {/* Shared Keys Toggle */}
                <div className="flex items-center justify-start gap-2">
                  <Controller
                    name={`${currentProviderKey}.useSharedKeys`}
                    control={form.control}
                    render={({ field }) => {
                      return (
                        <Switch
                          checked={field.value}
                          onCheckedChange={(value) => {
                            field.onChange(value);
                          }}
                        />
                      );
                    }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Shared Keys
                  </span>
                </div>

                {useSharedKeys ? (
                  /* Shared Keys Enabled */
                  <div className="space-y-6">
                    <p className="text-sm text-zinc-500 dark:text-neutral-400">
                      Shared keys are created by the InsForge team for development. It helps you get
                      started, but will show a InsForge logo and name on the OAuth screen.
                    </p>

                    <div className="flex items-center gap-3">
                      <img src={WarningIcon} alt="Warning" className="h-6 w-6" />
                      <span className="text-sm font-medium text-zinc-950 dark:text-white">
                        Shared keys should never be used in production
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Shared Keys Disabled */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <a
                        href={provider?.setupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium underline"
                      >
                        Create a {provider?.name.split(' ')[0]} OAuth App
                      </a>
                      <span className="text-sm font-normal text-zinc-950 dark:text-white">
                        {' '}
                        and set the callback url to:
                      </span>
                    </div>

                    <div className="space-x-3">
                      <div className="flex items-center gap-2">
                        <code className="flex items-center py-1 px-3 bg-blue-100 dark:bg-neutral-700 text-blue-800 dark:text-blue-300 font-mono break-all rounded-md text-sm">
                          {getCallbackUrl(provider?.id)}
                        </code>
                        <CopyButton className="h-9" text={getCallbackUrl(provider?.id)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!useSharedKeys && (
                <div className="space-y-6 p-6 border-t border-zinc-200 dark:border-neutral-700">
                  <div className="flex flex-row items-center justify-between gap-10">
                    <label className="text-sm text-zinc-950 dark:text-white">Client ID</label>
                    <Input
                      type="text"
                      {...form.register(`${currentProviderKey}.clientId`)}
                      placeholder={`Enter ${provider?.name.split(' ')[0]} OAuth App ID`}
                      className="w-[340px] dark:bg-neutral-900 dark:placeholder:text-neutral-400 dark:border-neutral-700 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-row items-center justify-between gap-10">
                    <label className="text-sm text-zinc-950 dark:text-white">Client Secret</label>
                    <Input
                      type="password"
                      {...form.register(`${currentProviderKey}.clientSecret`)}
                      placeholder={`Enter ${provider?.name.split(' ')[0]} OAuth App Secret`}
                      className="w-[340px] dark:bg-neutral-900 dark:placeholder:text-neutral-400 dark:border-neutral-700 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </form>

            <DialogFooter className="p-6 border-t border-zinc-200 dark:border-neutral-700">
              <Button
                type="button"
                className="h-9 w-30 px-3 py-2 dark:bg-neutral-600 dark:text-white dark:border-transparent dark:hover:bg-neutral-700"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isUpdateDisabled()}
                className="h-9 w-30 px-3 py-2 dark:bg-emerald-300 dark:text-black dark:hover:bg-emerald-400"
              >
                {saving ? 'Adding...' : 'Add Integration'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
