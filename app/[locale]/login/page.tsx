'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Navigation from '../../components/Navigation';

// Import LoginForm component that uses useSearchParams
import LoginForm from '../../components/LoginForm';

export default function Login() {
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations('login');
  const appT = useTranslations('app');
  
  // Redirect to home if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{appT('title')}</h1>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              {t('title')}
            </h2>
          </div>

          <Suspense fallback={<div className="text-center">{appT('common.loading')}</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
} 