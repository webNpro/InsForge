import { Handle, Position } from 'reactflow';
import { Lock, ExternalLink, FormInput, Users } from 'lucide-react';
import GoogleIcon from '@/assets/icons/google.svg';
import GithubIcon from '@/assets/icons/github.svg';

export interface AuthProvider {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

interface AuthNodeProps {
  data: {
    providers: AuthProvider[];
    userCount?: number;
    sessionCount?: number;
    isConfigured: boolean;
  };
}

export function AuthNode({ data }: AuthNodeProps) {
  const { providers, userCount } = data;

  const enabledProviders = providers.filter((provider) => provider.enabled);
  const enabledCount = enabledProviders.length;

  return (
    <div className="bg-neutral-900 rounded-lg border border-[#363636] min-w-[280px]">
      <Handle type="target" position={Position.Left} className="!bg-lime-300" />

      {/* Auth Header */}
      <div className="flex items-center justify-between p-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-11 h-11 bg-lime-300 rounded p-1.5">
            <Lock className="w-5 h-5 text-neutral-900" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">Authentication</h3>
            <p className="text-xs text-neutral-300">
              {enabledCount} method{enabledCount !== 1 ? 's' : ''} enabled
            </p>
          </div>
        </div>
        <div className="p-1.5">
          <ExternalLink className="w-4 h-4 text-neutral-400" />
        </div>
      </div>

      {/* Auth Providers */}
      <div className="p-2 space-y-2 border-b border-neutral-800">
        {/* Email/Password */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-800 rounded">
          <div className="flex items-center gap-2.5">
            <FormInput className="w-5 h-5 text-neutral-300" />
            <span className="text-sm text-neutral-300">Email/Password</span>
          </div>
          <div className="px-1.5 py-0.5 bg-lime-200 rounded">
            <span className="text-xs font-medium text-lime-900">Enabled</span>
          </div>
        </div>

        {/* Google OAuth */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-800 rounded">
          <div className="flex items-center gap-2.5">
            <img src={GoogleIcon} alt="google" className="h-5 w-5" />
            <span className="text-sm text-neutral-300">Google OAuth</span>
          </div>
          <div className="px-1.5 py-0.5 bg-neutral-700 rounded">
            <span className="text-xs font-medium text-neutral-400">Disabled</span>
          </div>
        </div>

        {/* GitHub OAuth */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-800 rounded">
          <div className="flex items-center gap-2.5">
            <img src={GithubIcon} alt="github" className="h-5 w-5" />
            <span className="text-sm text-neutral-300">GitHub OAuth</span>
          </div>
          <div className="px-1.5 py-0.5 bg-lime-200 rounded">
            <span className="text-xs font-medium text-lime-900">Enabled</span>
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

      <Handle type="source" position={Position.Right} className="!bg-lime-300" />
    </div>
  );
}
