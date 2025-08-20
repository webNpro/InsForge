import { CodeBlock } from '@/components/CodeBlock';
import { ServerEvents, useSocket } from '@/lib/contexts/SocketContext';
import { ClockIcon } from 'lucide-react';
import CheckedIcon from '@/assets/icons/checked.svg';
import { useEffect, useState } from 'react';

export function TestConnectionStep() {
  const [showSuccess, setShowSuccess] = useState(false);

  // Use the Socket hook - it will auto-connect
  const { socket } = useSocket();

  // Show success message when mcp connects
  useEffect(() => {
    const handleMcpConnected = () => setShowSuccess(true);

    socket?.on(ServerEvents.MCP_CONNECTED, handleMcpConnected);

    return () => {
      socket?.off(ServerEvents.MCP_CONNECTED, handleMcpConnected);
    };
  }, [socket]);

  return (
    <div className="space-y-6 border border-transparent dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 py-8 px-6">
      <div>
        <p className="text-zinc-950 dark:text-white text-sm mb-4">
          Open your agent&apos;s chat interface, copy and send this:
        </p>
      </div>

      <CodeBlock
        code="I'm using InsForge as my backend platform, what is my current backend structure?"
        className="bg-slate-50 dark:bg-neutral-700 dark:text-white"
        buttonClassName="dark:bg-neutral-800 dark:hover:bg-neutral-800"
      />

      {!showSuccess && (
        <div className="flex items-center gap-2 text-zinc-500 dark:text-neutral-400">
          <ClockIcon className="w-5 h-5" />
          <p className="text-sm">Waiting for connection</p>
        </div>
      )}

      {showSuccess && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <img src={CheckedIcon} alt="Checked" className="w-5 h-5" />
          <p className="text-sm">API Call Detected, Connection Succeeded</p>
        </div>
      )}
    </div>
  );
}
