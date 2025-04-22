'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../components/Navigation';

export default function AuthError() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Authentication Error');
  const [errorType, setErrorType] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    
    if (error) {
      setErrorType(error);
      
      // Handle different error types
      switch (error) {
        case 'OAuthAccountNotLinked':
          setErrorTitle('账号登录方式不匹配');
          setErrorMessage(
            '您尝试使用Google登录，但系统中已存在一个使用相同邮箱的账号，该账号使用了不同的登录方式。' +
            '如需使用Google登录，请联系管理员启用账号链接功能，或使用原始注册方式登录。'
          );
          break;
        case 'AccessDenied':
          setErrorTitle('Access Denied');
          setErrorMessage('You do not have permission to sign in.');
          break;
        case 'Verification':
          setErrorTitle('Verification Required');
          setErrorMessage('The verification link is invalid or has expired.');
          break;
        case 'Configuration':
          setErrorTitle('Configuration Error');
          setErrorMessage('There is a problem with the server configuration.');
          break;
        default:
          setErrorMessage('An unexpected authentication error occurred. Please try again.');
      }
    } else {
      // No error specified, redirect to login
      router.push('/login');
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">API Manager</h1>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              {errorTitle}
            </h2>
          </div>

          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded dark:bg-red-900/50 dark:text-red-100 dark:border-red-800">
            <p className="mb-4">{errorMessage}</p>
            
            {errorType === 'OAuthAccountNotLinked' && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">What you can do:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sign in with the email/password you originally used</li>
                  <li>Use a different email address for your Google account</li>
                </ul>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col space-y-4">
            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Login
            </Link>
            <Link
              href="/register"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 