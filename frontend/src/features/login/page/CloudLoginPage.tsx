import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function CloudLoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loginWithAuthorizationCode, isAuthenticated } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      void navigate('/cloud/visualizer', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle authorization token exchange
  useEffect(() => {
    const authorizationCode = searchParams.get('authorizationCode');

    if (authorizationCode) {
      setAuthError(null);
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
    } else {
      setAuthError('No authorization code provided.');
    }
  }, [searchParams, setSearchParams, loginWithAuthorizationCode, navigate]);

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
    <div className="min-h-screen bg-neutral-800 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin mb-4">
          <LockIcon className="h-12 w-12 text-white mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Authenticating...</h2>
        <p className="text-sm text-gray-400">Please wait while we verify your identity</p>
      </div>
    </div>
  );
}
