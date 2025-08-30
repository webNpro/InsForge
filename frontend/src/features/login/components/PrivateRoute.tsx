import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils/utils';

interface PrivateRouteProps {
  classname: string;
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ classname, children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', classname)}>
        <LoadingState />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/dashboard/login" replace />;
};
