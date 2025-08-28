import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils/utils';

interface CloudLayoutProps {
  children: React.ReactNode;
}

interface RouterMessage {
  type: 'ROUTE_CHANGE' | 'REFRESH';
  path: string;
}

export default function CloudLayout({ children }: CloudLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCloudMessage = (event: MessageEvent) => {
      try {
        const message = event.data as RouterMessage;

        if (message.type === 'ROUTE_CHANGE' && message.path) {
          // Navigate to the corresponding cloud route
          void navigate(message.path);
        } else if (message.type === 'REFRESH') {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error handling router message:', error);
      }
    };

    // Add event listener for messages from parent window
    window.addEventListener('message', handleCloudMessage);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('message', handleCloudMessage);
    };
  }, [navigate]);

  return (
    <ThemeProvider forcedTheme="dark">
      <div
        className={cn(
          'h-screen bg-neutral-800',
          location.pathname !== '/cloud/visualizer' && 'pt-13 pl-13'
        )}
      >
        {children}
      </div>
    </ThemeProvider>
  );
}
