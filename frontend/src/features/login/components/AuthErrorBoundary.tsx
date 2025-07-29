import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/radix/Alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Auth error handled silently
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Clear auth token and reload to trigger re-authentication
    localStorage.removeItem('insforge_token');
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isAuthError =
        this.state.error?.message?.includes('auth') ||
        this.state.error?.message?.includes('401') ||
        this.state.error?.message?.includes('403');

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isAuthError ? 'Authentication Error' : 'Something went wrong'}
              </AlertTitle>
              <AlertDescription>
                {isAuthError
                  ? 'There was a problem with your authentication. Please try logging in again.'
                  : 'An unexpected error occurred. Please try refreshing the page.'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button onClick={this.handleReset} className="flex-1">
                {isAuthError ? 'Login Again' : 'Refresh Page'}
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 p-4 bg-gray-100 rounded-md">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs overflow-auto">{this.state.error?.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
