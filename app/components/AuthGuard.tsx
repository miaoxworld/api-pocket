'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('app.common');
  
  useEffect(() => {
    // Check session status
    console.log('Auth status:', status, 'Session:', session);
    
    // If the user is not authenticated, redirect to login
    if (status === 'unauthenticated') {
      console.log('User is not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
    
    // If authentication is still loading, don't do anything yet
    if (status === 'loading') {
      console.log('Session is loading');
      setIsLoading(true);
      return;
    }
    
    // Check if user exists in the database by making a request to the custom session endpoint
    const checkUserInDatabase = async () => {
      try {
        const response = await fetch('/api/auth/session');
        console.log('Session check response status:', response.status);
        
        if (response.status === 401) {
          // User is not in database, redirect to login
          console.log('User not found in database, redirecting to login');
          router.push('/login');
          return;
        }
        
        if (!response.ok) {
          console.error('Error checking session:', response.statusText);
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        
        // If there's no role requirement or the user has the required role, allow access
        if (!requiredRole || data?.user?.role === requiredRole) {
          console.log('User is authorized');
          setIsAuthorized(true);
        } else if (requiredRole && data?.user?.role !== requiredRole) {
          // If the user doesn't have the required role, redirect to an unauthorized page
          console.log('User does not have required role, redirecting to unauthorized');
          router.push('/unauthorized');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };
    
    // Call the function to check user in database
    if (session) {
      checkUserInDatabase();
    }
  }, [session, status, router, requiredRole]);
  
  // Show loading state while checking authorization
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{t('loading')}</p>
        </div>
      </div>
    );
  }
  
  // Don't render children if not authorized
  if (!isAuthorized) {
    return null;
  }
  
  return <>{children}</>;
} 