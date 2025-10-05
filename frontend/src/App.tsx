import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { AppRoutes } from '@/lib/routing/AppRoutes';
import { ToastProvider } from '@/lib/hooks/useToast';
import { SocketProvider } from '@/lib/contexts/SocketContext';
import { McpUsageProvider } from '@/features/usage/contexts/McpUsageContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <McpUsageProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </McpUsageProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
