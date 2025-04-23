'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AuthGuard from '../../components/AuthGuard';
import Navigation from '../../components/Navigation';

export default function DevTools() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const t = useTranslations('dev');
  const appT = useTranslations('app');
  
  // 表单数据
  const [days, setDays] = useState(30);
  const [keysPerDay, setKeysPerDay] = useState(5);
  const [requestsPerKey, setRequestsPerKey] = useState(10);
  const [tokensPerRequest, setTokensPerRequest] = useState(1000);
  
  const generateTestData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const response = await fetch('/api/dev/generate-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          days,
          keysPerDay,
          requestsPerKey,
          tokensPerRequest
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate test data');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-grow p-8">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-yellow-700">
                <strong>{appT('common.warning')}:</strong> {t('warning')}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-4">{t('testData.title')}</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('testData.description')}
              </p>
              
              <form onSubmit={generateTestData} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('testData.days')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('testData.daysLimit')}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('testData.keysPerDay')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      value={keysPerDay}
                      onChange={(e) => setKeysPerDay(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('testData.keysLimit')}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('testData.requestsPerKey')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      value={requestsPerKey}
                      onChange={(e) => setRequestsPerKey(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('testData.requestsLimit')}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('testData.tokensPerRequest')}
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      value={tokensPerRequest}
                      onChange={(e) => setTokensPerRequest(parseInt(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('testData.tokensNote')}</p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? t('testData.generating') : t('testData.generate')}
                  </button>
                </div>
              </form>
              
              {error && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              {result && (
                <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <p className="text-green-700">
                    <strong>{t('testData.success')}:</strong> {result.message}
                  </p>
                  {result.stats && (
                    <div className="mt-2">
                      <p className="text-sm text-green-600">
                        {t('testData.successMessage', {
                          records: result.stats.records,
                          days: result.stats.days,
                          keys: result.stats.keys
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 