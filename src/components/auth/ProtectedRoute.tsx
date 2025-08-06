import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'seller';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { currentUser, loading, userProfile, isAdmin, isSeller } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Check if user is active
  if (userProfile && userProfile.isActive === false) {
    return <Navigate to="/login" />;
  }

  // Check role-based access
  if (requiredRole) {
    if (requiredRole === 'admin' && !(userProfile?.role === 'admin' || userProfile?.role === 'manager')) {
      return <Navigate to="/dashboard" />;
    }
    if (requiredRole === 'seller' && !isSeller) {
      return <Navigate to="/dashboard" />;
    }
  }

  return <>{children}</>;
};