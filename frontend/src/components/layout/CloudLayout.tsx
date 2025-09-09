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

  useEffect(() => {
    // Only send messages if we're in an iframe (not the main window)
    if (window.parent !== window) {
      const targetOrigin = window.location.origin.includes('localhost')
        ? 'http://localhost:5173'
        : 'https://insforge.dev';
      // Send the current route to the parent cloud application
      window.parent.postMessage(
        {
          type: 'IFRAME_ROUTE_CHANGE',
          path: location.pathname,
          search: location.search,
          fullPath: location.pathname + location.search,
        },
        targetOrigin
      );
    }
  }, [location.pathname, location.search]);

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
