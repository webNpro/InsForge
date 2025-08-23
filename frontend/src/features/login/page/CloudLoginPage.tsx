import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function CloudLoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loginWithAuthorizationCode, isAuthenticated } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle authorization token exchange
  useEffect(() => {
    const authorizationCode = searchParams.get('authorizationCode');
    if (!authorizationCode) {
      setAuthError('No authorization code provided.');
      return;
    }

    if (authorizationCode && !isAuthenticated) {
      setAuthError(null);

      // Clear the token from URL to prevent reuse
      setSearchParams({}, { replace: true });

      // Exchange the authorization code for an access token
      loginWithAuthorizationCode(authorizationCode)
        .then((success) => {
          if (success) {
            // Notify parent of success
            if (window.parent !== window) {
              window.parent.postMessage(
                {
                  type: 'AUTH_SUCCESS',
                },
                '*'
              );
            }
            void navigate('/cloud/visualizer', { replace: true });
          } else {
            setAuthError('The authorization code may have expired or already been used.');
            if (window.parent !== window) {
              window.parent.postMessage(
                {
                  type: 'AUTH_ERROR',
                  message: 'Authorization code validation failed',
                },
                '*'
              );
            }
          }
        })
        .catch((error) => {
          console.error('Authorization code exchange failed:', error);
          setAuthError('The authorization code may have expired or already been used.');
          if (window.parent !== window) {
            window.parent.postMessage(
              {
                type: 'AUTH_ERROR',
                message: 'Authorization code validation failed',
              },
              '*'
            );
          }
        });
    }
  }, [searchParams, setSearchParams, loginWithAuthorizationCode, navigate, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void navigate('/cloud/visualizer', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show error state if authentication failed
  if (authError) {
    return (
      <div className="min-h-screen bg-neutral-800 flex items-center justify-center px-4">
        <div className="text-center text-white">
          <LockIcon className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
          <p className="text-gray-400 text-sm max-w-md">{authError}</p>
        </div>
      </div>
    );
  }

  // Show authenticating state
  return (
    <div className="min-h-screen bg-neutral-800 items-center justify-center px-4">
      <div className="bg-gray-800 rounded-lg p-8 shadow-2xl">
        <div className="text-center space-y-4">
          <div className="animate-spin">
            <LockIcon className="h-12 w-12 text-white mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-white">Authenticating...</h2>
          <p className="text-sm text-gray-400">Please wait while we verify your identity</p>
        </div>
      </div>
    </div>
  );
}
