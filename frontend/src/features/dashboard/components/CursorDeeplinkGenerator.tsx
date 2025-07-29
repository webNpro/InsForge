import { useMemo } from 'react';

interface CursorDeeplinkGeneratorProps {
  apiKey?: string;
  apiBaseUrl?: string;
  os?: 'windows' | 'macos-linux';
}

export function CursorDeeplinkGenerator({
  apiKey,
  apiBaseUrl = 'http://localhost:7130',
  os = 'macos-linux',
}: CursorDeeplinkGeneratorProps) {
  const deeplink = useMemo(() => {
    const env = {
      API_KEY: apiKey || 'your-api-key-here',
      API_BASE_URL: apiBaseUrl,
    };

    const config =
      os === 'windows'
        ? {
            command: 'cmd',
            args: ['/c', 'npx', '-y', '@insforge/insforge-mcp@latest'],
            env,
          }
        : {
            command: 'npx',
            args: ['-y', '@insforge/insforge-mcp@latest'],
            env,
          };

    const configString = JSON.stringify(config);
    const base64Config = btoa(configString);
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=insforge&config=${encodeURIComponent(base64Config)}`;
  }, [apiKey, apiBaseUrl, os]);

  const handleOpenInCursor = () => {
    window.open(deeplink, '_blank');
  };

  return (
    <button
      onClick={handleOpenInCursor}
      className="inline-block"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <img
        src="https://cursor.com/deeplink/mcp-install-dark.svg"
        alt="Add to Cursor"
        style={{ height: '28px' }}
      />
    </button>
  );
}
