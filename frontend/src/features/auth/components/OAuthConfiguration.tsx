import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/radix/Button';
import { Switch } from '@/components/radix/Switch';
import { PromptDialog } from '@/components/PromptDialog';
import { OAuthDialog } from './OAuthDialog';
import { configService } from '@/features/auth/services/config.service';
import { useToast } from '@/lib/hooks/useToast';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { MoreVertical } from 'lucide-react';
import GithubDark from '@/assets/icons/github_dark.svg';
import GithubLight from '@/assets/icons/github.svg';
import Google from '@/assets/icons/google.svg';
import { OAuthConfigSchema } from '@insforge/shared-schemas';
import { generateAIAuthPrompt } from '@/features/auth/helpers';

export interface OAuthProviderInfo {
  id: 'google' | 'github';
  name: string;
  icon: string;
  description: string;
  setupUrl: string;
}

interface OAuthConfigurationProps {
  onNavigateToUsers?: () => void;
}

export function OAuthConfiguration({ onNavigateToUsers }: OAuthConfigurationProps) {
  const [selectedProvider, setSelectedProvider] = useState<OAuthProviderInfo>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [selectedPromptProvider, setSelectedPromptProvider] = useState<OAuthProviderInfo>();
  const [oauthConfig, setOauthConfig] = useState<OAuthConfigSchema>();
  const [loading, setLoading] = useState(true);
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

  // Unified OAuth submit logic for both dialog and toggle operations
  const submitOAuthConfig = async (
    providerId: 'google' | 'github',
    configData: OAuthConfigSchema,
    useSharedKeys: boolean,
    isFromDialog: boolean = false
  ) => {
    try {
      // Transform data to ensure required fields are present
      const transformedData = {
        ...configData,
        [providerId]: {
          ...configData[providerId],
          clientId: configData[providerId].clientId || '',
          clientSecret: configData[providerId].clientSecret || '',
          redirectUri:
            configData[providerId].redirectUri ||
            `${window.location.origin}/api/auth/oauth/${providerId}/callback`,
          enabled: isFromDialog ? !!configData[providerId].clientId || useSharedKeys : true,
          useSharedKeys,
        },
      };

      await configService.updateOAuthConfig(transformedData);

      // Reload OAuth configuration to apply changes
      await configService.reloadOAuthConfig();

      // Update local state
      setOauthConfig(transformedData);

      const configType = useSharedKeys ? 'shared keys' : 'custom OAuth credentials';
      const actionText = isFromDialog ? 'updated and applied' : 'enabled';
      showToast(`${providerId} OAuth ${configType} ${actionText} successfully!`, 'success');

      return true;
    } catch (error) {
      console.error(`Failed to ${isFromDialog ? 'update' : 'enable'} ${providerId} OAuth:`, error);
      const actionText = isFromDialog ? 'update' : 'enable';
      showToast(`Failed to ${actionText} ${providerId} OAuth`, 'error');
      return false;
    }
  };

  const handleConnect = async (provider: OAuthProviderInfo) => {
    const enabled = isProviderEnabled(provider.id);

    if (!enabled) {
      // If not enabled, enable it first with shared keys
      const success = await handleToggleSubmit(provider.id, true);
      if (!success) {
        return;
      }
    }

    // Show prompt dialog
    setSelectedPromptProvider(provider);
    setIsPromptDialogOpen(true);
  };

  const handleToggleSubmit = async (
    providerId: 'google' | 'github',
    useSharedKeys: boolean = true
  ) => {
    if (!oauthConfig) {
      return false;
    }
    return await submitOAuthConfig(providerId, oauthConfig, useSharedKeys, false);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProvider(undefined);
  };

  const handleToggleProvider = async (providerId: 'google' | 'github', enabled: boolean) => {
    if (!oauthConfig) {
      return;
    }

    if (enabled) {
      // If turning on, enable OAuth with shared keys by default
      await handleToggleSubmit(providerId, true);
    } else {
      // If turning off, just disable it
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
        setOauthConfig(updatedConfig);
        showToast(`${providerId} OAuth disabled`, 'success');
      } catch (error) {
        console.error(`Failed to disable ${providerId} OAuth:`, error);
        showToast(`Failed to disable ${providerId} OAuth`, 'error');
      }
    }
  };

  const handleSuccess = useCallback(() => {
    // Refresh configuration after successful update
    void loadOAuthConfig();
  }, [loadOAuthConfig]);

  // Callback function for dialog submission
  const handleDialogSubmit = useCallback(
    async (
      providerId: 'google' | 'github',
      configData: OAuthConfigSchema,
      useSharedKeys: boolean
    ) => {
      return await submitOAuthConfig(providerId, configData, useSharedKeys, true);
    },
    [submitOAuthConfig]
  );

  const handleViewUsers = () => {
    setIsPromptDialogOpen(false);
    onNavigateToUsers?.();
  };

  const isProviderEnabled = (providerId: 'google' | 'github') => {
    if (!oauthConfig) {
      return false;
    }
    return oauthConfig[providerId]?.enabled || false;
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
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">OAuth Providers</h2>
          <p className="text-gray-600 dark:text-zinc-300">
            Configure OAuth providers to enable social authentication for your users.
          </p>
        </div>

        <div className="flex-1">
          <div className="space-y-3">
            {providers.map((provider) => {
              const enabled = isProviderEnabled(provider.id);

              return (
                <div
                  key={provider.id}
                  className="flex items-center justify-between px-6 py-3 bg-white rounded-[8px] border border-gray-200 dark:border-transparent dark:bg-[#333333] dark:hover:bg-neutral-600 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => handleConfigureProvider(provider)}
                >
                  <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleToggleProvider(provider.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <img src={provider.icon} alt={provider.name} className="w-6 h-6" />

                    {/* Provider Name */}
                    <div className="h-6 w-80 text-sm font-medium text-black dark:text-white">
                      {provider.name}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      className="h-9 px-3 py-2 dark:bg-emerald-300 dark:hover:bg-emerald-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleConnect(provider);
                      }}
                    >
                      Connect
                    </Button>
                    <div className="flex items-center justify-center p-2 text-neutral-400">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <OAuthDialog
        provider={selectedProvider}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
        onSubmit={handleDialogSubmit}
      />

      <PromptDialog
        open={isPromptDialogOpen}
        onOpenChange={setIsPromptDialogOpen}
        title={selectedPromptProvider ? `Add ${selectedPromptProvider.name}` : 'OAuth Integration'}
        subtitle="Copy this prompt to your agent"
        prompt={selectedPromptProvider ? generateAIAuthPrompt(selectedPromptProvider) : ''}
        additionalAction={
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 py-2 text-sm font-medium bg-zinc-50 dark:bg-neutral-700 dark:text-white border-border-gray dark:border-neutral-700 border shadow"
            onClick={handleViewUsers}
          >
            View Users
          </Button>
        }
      />
    </>
  );
}
