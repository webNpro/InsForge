import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-gray dark:bg-neutral-800 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/dashboard/login" replace />;
};
