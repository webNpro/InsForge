import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/radix/Button';
import { configService } from '@/features/auth/services/config.service';
import { useToast } from '@/lib/hooks/useToast';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { MoreHorizontal, Plus, Trash2, Pencil } from 'lucide-react';
import GithubDark from '@/assets/icons/github_dark.svg';
import GithubLight from '@/assets/icons/github.svg';
import Google from '@/assets/icons/google.svg';
import { OAuthConfigSchema } from '@insforge/shared-schemas';
import { generateAIAuthPrompt } from '@/features/auth/helpers';
import { OAuthEmptyState } from './OAuthEmptyState';
import { OAuthMethodDialog } from './OAuthMethodDialog';
import { OAuthConfigDialog } from './OAuthConfigDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/radix/DropdownMenu';
import { CopyButton } from '@/components/CopyButton';

export interface OAuthProviderInfo {
  id: 'google' | 'github';
  name: string;
  icon: string;
  description: string;
  setupUrl: string;
}

export function OAuthConfiguration() {
  const [selectedProvider, setSelectedProvider] = useState<OAuthProviderInfo>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfigSchema>();
  const [loading, setLoading] = useState(true);
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const { showToast } = useToast();
  const { resolvedTheme } = useTheme();

  const providers: OAuthProviderInfo[] = useMemo(
    () => [
      {
        id: 'google',
        name: 'Google OAuth',
        icon: Google,
        description: 'Configure Google authentication for your users',
        setupUrl: 'https://console.cloud.google.com/apis/credentials',
      },
      {
        id: 'github',
        name: 'GitHub OAuth',
        icon: resolvedTheme === 'light' ? GithubDark : GithubLight,
        description: 'Configure GitHub authentication for your users',
        setupUrl: 'https://github.com/settings/developers',
      },
    ],
    [resolvedTheme]
  );

  const loadOAuthConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await configService.getOAuthConfig();
      setOauthConfig(config);
    } catch (error) {
      console.error('Failed to load OAuth configuration:', error);
      showToast('Failed to load OAuth configuration', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load OAuth configuration on component mount
  useEffect(() => {
    void loadOAuthConfig();
  }, [loadOAuthConfig]);

  const handleConfigureProvider = (provider: OAuthProviderInfo) => {
    setSelectedProvider(provider);
    setIsDialogOpen(true);
  };

  // Disable OAuth provider
  const disableOAuthProvider = async (providerId: 'google' | 'github', providerName: string) => {
    if (!oauthConfig) {
      return false;
    }

    try {
      const updatedConfig = {
        ...oauthConfig,
        [providerId]: {
          ...oauthConfig[providerId],
          enabled: false,
        },
      };

      await configService.updateOAuthConfig(updatedConfig);
      await configService.reloadOAuthConfig();
      showToast(`${providerName} disabled`, 'success');
      setOauthConfig(updatedConfig);
      return true;
    } catch (error) {
      console.error(`Failed to disable ${providerId} OAuth:`, error);
      showToast(`Failed to disable ${providerName}`, 'error');
      return false;
    }
  };

  // Enable OAuth provider with shared keys by default
  const enableOAuthProvider = async (
    providerId: 'google' | 'github',
    providerName: string,
    actionText: string = 'enabled'
  ) => {
    if (!oauthConfig) {
      return false;
    }

    try {
      const updatedConfig = {
        ...oauthConfig,
        [providerId]: {
          ...oauthConfig[providerId],
          enabled: true,
          useSharedKeys: true,
        },
      };

      await configService.updateOAuthConfig(updatedConfig);
      await configService.reloadOAuthConfig();
      setOauthConfig(updatedConfig);

      // Only show individual success toast if not called from dialog
      if (actionText !== 'added') {
        showToast(`${providerName} ${actionText} successfully!`, 'success');
      }

      return true;
    } catch (error) {
      console.error(`Failed to ${actionText} ${providerName}:`, error);
      showToast(
        `Failed to ${actionText} ${providerName}. Please check running environment and try again.`,
        'error'
      );
      return false;
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProvider(undefined);
  };

  const hasAuthMethods = useMemo(() => {
    if (!oauthConfig) {
      return false;
    }
    return Boolean(oauthConfig.google?.enabled || oauthConfig.github?.enabled);
  }, [oauthConfig]);

  const openSelectDialog = () => {
    setIsSelectDialogOpen(true);
  };

  const enabledProviders = useMemo(() => {
    if (!oauthConfig) {
      return { google: false, github: false };
    }
    return {
      google: Boolean(oauthConfig.google?.enabled),
      github: Boolean(oauthConfig.github?.enabled),
    };
  }, [oauthConfig]);

  const handleConfirmSelected = async (selectedIds: ('google' | 'github')[]) => {
    if (selectedIds.length === 0) {
      setIsSelectDialogOpen(false);
      return;
    }

    try {
      // Enable selected providers with shared keys by default
      await Promise.all(
        selectedIds.map(async (providerId) => {
          const providerInfo = providers.find((p) => p.id === providerId)!;
          await enableOAuthProvider(providerId, providerInfo.name, 'added');
        })
      );
      await loadOAuthConfig();
      setIsSelectDialogOpen(false);
    } catch (err) {
      console.error('Failed to add selected auth providers', err);
    }
  };

  const handleSuccess = useCallback(() => {
    // Refresh configuration after successful update
    void loadOAuthConfig();
  }, [loadOAuthConfig]);

  // Generate combined prompt for all enabled providers
  const generateCombinedPrompt = () => {
    if (!oauthConfig) return '';

    const enabledProviders = providers.filter((provider) => oauthConfig[provider.id]?.enabled);

    if (enabledProviders.length === 0) return '';

    return generateAIAuthPrompt(enabledProviders);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-sm text-gray-500 dark:text-zinc-400">
            Loading OAuth configuration...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 h-full overflow-hidden p-6 w-full max-w-[1080px] mx-auto">
        {/* Copy Prompt Banner */}
        {hasAuthMethods && (
          <div className="bg-white dark:bg-emerald-300/5 border border-zinc-200 dark:border-green-300 rounded-sm py-3 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  Integrate Authentication
                </p>
                <p className="text-sm text-zinc-500 dark:text-neutral-400">
                  Copy prompt to your agent and the authentication method below will be integrated
                  automatically.
                </p>
              </div>
              <CopyButton
                text={generateCombinedPrompt()}
                variant="default"
                size="sm"
                className="h-8 px-3 py-1 text-xs font-medium text-zinc-900 dark:bg-emerald-300 dark:hover:bg-emerald-400 dark:text-black data-[copied=true]:bg-transparent dark:data-[copied=true]:bg-neutral-700 data-[copied=true]:cursor-default data-[copied=true]:shadow-none data-[copied=true]:border-none data-[copied=true]:hover:bg-transparent dark:data-[copied=true]:text-white"
                copyText="Copy Prompt"
                copiedText="Copied - Paste to agent"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Auth Method</h2>
          <Button
            className="h-9 pr-3 pl-2 py-2 gap-2 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600 text-sm font-medium rounded-sm"
            onClick={openSelectDialog}
          >
            <Plus className="w-5 h-5" />
            Add Auth
          </Button>
        </div>

        <div className="flex-1">
          {hasAuthMethods ? (
            <div className="grid grid-cols-4 gap-x-3 gap-y-6">
              {providers.map((provider) => {
                const isEnabled = oauthConfig?.[provider.id]?.enabled;
                if (!isEnabled) return null;

                return (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between h-15 p-4 bg-white rounded-[8px] border border-gray-200 dark:border-transparent dark:bg-[#333333]"
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <img src={provider.icon} alt={provider.name} className="w-6 h-6" />

                      <div className="text-sm font-medium text-black dark:text-white">
                        {provider.name}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-7 w-7 p-1 text-gray-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          variant="ghost"
                          size="sm"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 py-1 px-2">
                        <DropdownMenuItem
                          onClick={() => handleConfigureProvider(provider)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Pencil className="w-5 h-5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => disableOAuthProvider(provider.id, provider.name)}
                          className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          ) : (
            <OAuthEmptyState />
          )}
        </div>
      </div>

      <OAuthMethodDialog
        provider={selectedProvider}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
      />

      <OAuthConfigDialog
        providers={providers}
        open={isSelectDialogOpen}
        onOpenChange={setIsSelectDialogOpen}
        onConfirm={handleConfirmSelected}
        enabledProviders={enabledProviders}
      />
    </>
  );
}
