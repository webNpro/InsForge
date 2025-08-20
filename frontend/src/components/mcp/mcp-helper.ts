export interface MCPAgent {
  id: string;
  displayName: string;
  logo?: string;
  darkLogo?: string;
  description?: string;
}

export type PlatformType = 'macos-linux' | 'windows';

// Helper to get the API base URL
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7130';

export const GenerateInstallCommand = (agent: MCPAgent, apiKey: string) => {
  return `npx @insforge/install --client ${agent.id} --env API_KEY=${apiKey} --env API_BASE_URL=${apiBaseUrl}`;
};

export const MCP_AGENTS: MCPAgent[] = [
  {
    id: 'cursor',
    displayName: 'Cursor',
    logo: '/icons/cursor_logo.svg',
    darkLogo: '/icons/cursor_logo.svg',
    description: 'AI-powered code editor with built-in MCP support',
  },
  {
    id: 'claude-code',
    displayName: 'Claude Code',
    logo: '/icons/claude_code_logo.svg',
    darkLogo: '/icons/claude_code_logo.svg',
    description: "Anthropic's Claude with MCP integration",
  },
  {
    id: 'windsurf',
    displayName: 'Windsurf',
    logo: '/icons/windsurf_logo.svg',
    darkLogo: '/icons/windsurf_logo_dark.svg',
    description: 'Next-generation AI development environment',
  },
  {
    id: 'cline',
    displayName: 'Cline',
    logo: '/icons/cline_logo.svg',
    darkLogo: '/icons/cline_logo_dark.svg',
    description: 'Intelligent coding assistant with MCP support',
  },
  {
    id: 'roocode',
    displayName: 'Roo Code',
    logo: '/icons/roo_code_logo.svg',
    darkLogo: '/icons/roo_code_logo_dark.svg',
    description: 'Smart code completion and assistance tool',
  },
  {
    id: 'mcp',
    displayName: 'MCP JSON',
    description: 'Direct MCP configuration for manual setup',
  },
];

// Core MCP server configuration builder
export const createMCPServerConfig = (
  apiKey: string,
  platform: PlatformType,
  apiBaseUrl?: string
) => {
  const env = {
    API_KEY: apiKey,
    API_BASE_URL: apiBaseUrl || import.meta.env.VITE_API_BASE_URL,
  };

  if (platform === 'windows') {
    return {
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@insforge/insforge-mcp@latest'],
      env,
    };
  } else {
    return {
      command: 'npx',
      args: ['-y', '@insforge/insforge-mcp@latest'],
      env,
    };
  }
};

// Full MCP configuration for AI assistants
export const createMCPConfig = (apiKey: string, platform: PlatformType, apiBaseUrl?: string) => {
  return {
    mcpServers: {
      insforge: createMCPServerConfig(apiKey, platform, apiBaseUrl),
    },
  };
};
