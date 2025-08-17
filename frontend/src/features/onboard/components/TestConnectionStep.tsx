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
    <div className="space-y-6 bg-white py-8 px-6 rounded-xl border border-border-gray">
      <div>
        <p className="text-zinc-950 text-sm mb-4">
          Open your agent&apos;s chat interface, copy and send this:
        </p>
      </div>

      <CodeBlock
        code="I'm using InsForge as my backend platform, what is my current backend structure?"
        className="bg-slate-50"
      />

      {!showSuccess && (
        <div className="flex items-center gap-2 text-zinc-500">
          <ClockIcon className="w-5 h-5" />
          <p className="text-sm">Waiting for connection</p>
        </div>
      )}

      {showSuccess && (
        <div className="flex items-center gap-2 text-green-700">
          <img src={CheckedIcon} alt="Checked" className="w-5 h-5" />
          <p className="text-sm">API Call Detected, Connection Succeeded</p>
        </div>
      )}
    </div>
  );
}
