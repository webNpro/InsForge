import { Lock, FormInput, Users } from 'lucide-react';
import GoogleIcon from '@/assets/logos/google.svg';
import GithubIcon from '@/assets/logos/github.svg';
import { AuthMetadataSchema } from '@insforge/shared-schemas';
import { cn } from '@/lib/utils/utils';
import { useOAuthConfig } from '@/features/auth/hooks/useOAuthConfig';

interface AuthNodeProps {
  data: {
    authMetadata: AuthMetadataSchema;
    userCount?: number;
  };
}

export function AuthNode({ data }: AuthNodeProps) {
  const { authMetadata, userCount } = data;
  const { isProviderConfigured } = useOAuthConfig();

  const enabledCount = authMetadata.oauths.length;

  return (
    <div className="bg-neutral-900 rounded-lg border border-[#363636] min-w-[280px]">
      {/* Auth Header */}
      <div className="flex items-center justify-between p-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-11 h-11 bg-lime-300 rounded p-1.5">
            <Lock className="w-5 h-5 text-neutral-900" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">Authentication</h3>
            <p className="text-xs text-neutral-300">
              {enabledCount} provider{enabledCount !== 1 ? 's' : ''} enabled
            </p>
          </div>
        </div>
        {/* <div className="p-1.5">
          <ExternalLink className="w-4 h-4 text-neutral-400" />
        </div> */}
      </div>

      {/* Auth Providers */}
      <div className="p-2 space-y-2 border-b border-neutral-800">
        {/* Email/Password */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-800 rounded">
          <div className="flex items-center gap-2.5">
            <FormInput className="w-5 h-5 text-neutral-300" />
            <span className="text-sm text-neutral-300">Email/Password</span>
          </div>
          <div className="px-1.5 py-0.5 bg-lime-200 rounded flex items-center">
            <span className="text-xs font-medium text-lime-900">Enabled</span>
          </div>
        </div>

        {/* Google OAuth */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-800 rounded">
          <div className="flex items-center gap-2.5">
            <img src={GoogleIcon} alt="google" className="h-5 w-5" />
            <span className="text-sm text-neutral-300">Google OAuth</span>
          </div>
          <div
            className={cn(
              'px-1.5 py-0.5 rounded flex items-center',
              isProviderConfigured('google')
                ? 'bg-lime-200 text-lime-900'
                : 'bg-neutral-700 text-neutral-300'
            )}
          >
            <span className="text-xs font-medium">
              {isProviderConfigured('google') ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* GitHub OAuth */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-800 rounded">
          <div className="flex items-center gap-2.5">
            <img src={GithubIcon} alt="github" className="h-5 w-5" />
            <span className="text-sm text-neutral-300">GitHub OAuth</span>
          </div>
          <div
            className={cn(
              'px-1.5 py-0.5 rounded flex items-center',
              isProviderConfigured('github')
                ? 'bg-lime-200 text-lime-900'
                : 'bg-neutral-700 text-neutral-300'
            )}
          >
            <span className="text-xs font-medium">
              {isProviderConfigured('github') ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Users Section */}
      <div className="flex items-center justify-between p-3 border-t border-neutral-700">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-neutral-300" />
          <span className="text-sm text-neutral-300">Users</span>
        </div>
        <div className="flex items-center">
          {userCount !== undefined && <span className="text-xs text-neutral-400">{userCount}</span>}
        </div>
      </div>
    </div>
  );
}
