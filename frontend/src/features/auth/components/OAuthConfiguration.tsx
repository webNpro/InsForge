import { useState, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { OAuthDialog } from './OAuthDialog';
import { configService } from '@/features/auth/services/config.service';
import { useToast } from '@/lib/hooks/useToast';
import Github from '@/assets/icons/github_dark.svg';
import Google from '@/assets/icons/google.svg';

const providers = [
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
    icon: Github,
    description: 'Configure GitHub authentication for your users',
    setupUrl: 'https://github.com/settings/developers',
  },
];

const NotConfirgured = () => {
  return (
    <p className="bg-zinc-100 text-xs font-medium text-zinc-500 py-2 px-3 rounded-sm">Disabled</p>
  );
};

const Configured = () => {
  return (
    <p className="bg-green-100 text-xs font-medium text-green-700 py-2 px-3 rounded-sm">Enabled</p>
  );
};

export function OAuthConfiguration() {
  const [selectedProvider, setSelectedProvider] = useState<(typeof providers)[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [oauthConfig, setOauthConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

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

  const handleConfigureProvider = (provider: (typeof providers)[0]) => {
    setSelectedProvider(provider);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProvider(null);
  };

  const handleSuccess = useCallback(() => {
    // Refresh configuration after successful update
    void loadOAuthConfig();
  }, [loadOAuthConfig]);

  const getProviderStatus = (providerId: string) => {
    if (!oauthConfig) {
      return <NotConfirgured />;
    }

    const config = oauthConfig[providerId];
    if (!config || (!config.clientId && !config.useSharedKeys)) {
      return <NotConfirgured />;
    }

    return <Configured />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-sm text-gray-500">Loading OAuth configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 h-full overflow-hidden p-6 w-full max-w-[1080px] mx-auto">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">OAuth Providers</h2>
          <p className="text-gray-600">
            Configure OAuth providers to enable social authentication for your users.
          </p>
        </div>

        <div className="flex-1">
          <div className="flex flex-col gap-3 w-full">
            {providers.map((provider) => (
              <Button
                className="h-auto w-full py-4 px-6 flex items-center justify-between bg-white hover:bg-zinc-100 border border-border-gray"
                key={provider.id}
                variant="ghost"
                size="sm"
                onClick={() => handleConfigureProvider(provider)}
              >
                <div className="flex items-center gap-3">
                  <img src={provider.icon} alt={provider.name} className="h-6 w-6" />
                  <p className="text-sm font-medium">{provider.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {getProviderStatus(provider.id)}
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <OAuthDialog
        provider={selectedProvider}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
      />
    </>
  );
}
