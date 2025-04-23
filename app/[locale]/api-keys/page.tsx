'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AuthGuard from "../../components/AuthGuard";
import Navigation from "../../components/Navigation";
import Toast from '../../components/Toast';
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useTranslations } from 'next-intl';

interface ApiEndpoint {
  id: string;
  name: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  createdAt: string;
  usage: {
    requests: number;
    tokens: number;
    lastUsed: string | null;
  };
}

export default function ApiKeys() {
  const { data: session } = useSession();
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [bulkKeys, setBulkKeys] = useState('');
  const [keyQuantity, setKeyQuantity] = useState(1);
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{id: string, success: boolean, message: string, timeConsumed?: number} | null>(null);

  // 翻译
  const t = useTranslations('apiKeys');
  const common = useTranslations('app.common');

  // Fetch API endpoints and keys
  useEffect(() => {
    if (session) {
      fetchApiEndpoints();
      fetchApiKeys();
    }
  }, [session]);

  // 复制成功提示自动消失
  useEffect(() => {
    if (copiedKey) {
      const timer = setTimeout(() => {
        setCopiedKey(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [copiedKey]);

  const fetchApiEndpoints = async () => {
    try {
      const response = await fetch('/api/endpoints');
      
      if (!response.ok) {
        throw new Error('Failed to fetch API endpoints');
      }
      
      const data = await response.json();
      setApiEndpoints(data.endpoints || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching API endpoints');
    }
  };

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/keys');
      
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      
      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyName || !keyValue) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: keyName,
          key: keyValue
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add API key');
      }
      
      // Reset form and fetch updated keys
      setKeyName('');
      setKeyValue('');
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkKeys.trim()) {
      setError('Please enter at least one key');
      return;
    }
    
    const keys = bulkKeys
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    
    if (keys.length === 0) {
      setError('Please enter at least one key');
      return;
    }
    
    try {
      const response = await fetch('/api/keys/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keys
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import API keys');
      }
      
      // Reset form and fetch updated keys
      setBulkKeys('');
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  const toggleKeyStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/keys/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update key status');
      }
      
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  const deleteKey = async (id: string) => {
    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete key');
      }
      
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const toggleSelectKey = (id: string) => {
    if (selectedKeys.includes(id)) {
      setSelectedKeys(selectedKeys.filter(key => key !== id));
    } else {
      setSelectedKeys([...selectedKeys, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(apiKeys.map(key => key.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;
    
    try {
      const response = await fetch('/api/keys/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: selectedKeys
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete keys');
      }
      
      setSelectedKeys([]);
      setSelectAll(false);
      setShowDeleteModal(false);
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    return `${key.slice(0, 5)}...${key.slice(-5)}`;
  };

  const handleRandomGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (keyQuantity < 1 || keyQuantity > 100) {
      setError('Please enter a quantity between 1 and 100');
      return;
    }
    
    try {
      setGeneratingKeys(true);
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: keyQuantity
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate keys');
      }
      
      setKeyQuantity(1);
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGeneratingKeys(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedKey(id);
      },
      (err) => {
        console.error('Could not copy text: ', err);
        setError('Failed to copy to clipboard');
      }
    );
  };

  const toggleKeyVisibility = (id: string) => {
    if (visibleKeys.includes(id)) {
      setVisibleKeys(visibleKeys.filter(key => key !== id));
    } else {
      setVisibleKeys([...visibleKeys, id]);
    }
  };

  const formatKey = (key: string, id: string) => {
    if (visibleKeys.includes(id)) {
      return key;
    }
    return maskKey(key);
  };

  const testApiKey = async (key: ApiKey) => {
    setTestingKey(key.id);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.key}` },
        body: JSON.stringify({ key: key.key })
      });
      
      const data = await response.json();
      
      setTestResult({
        id: key.id,
        success: response.ok,
        message: data.message,
        timeConsumed: data.timeConsumed
      });
    } catch (err) {
      setTestResult({
        id: key.id,
        success: false,
        message: 'Network error occurred'
      });
    } finally {
      setTimeout(() => setTestingKey(null), 1000);
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-grow p-8">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">{t('title')}</h1>
              <LanguageSwitcher />
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
              <div className="flex flex-wrap items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t('createNewKey')}</h2>
                <div className="space-x-2">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={selectedKeys.length === 0}
                    className={`px-4 py-2 rounded-md ${
                      selectedKeys.length > 0
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {t('delete')} ({selectedKeys.length})
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Manual Key Addition Form */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">{t('addManually')}</h3>
                  <form onSubmit={handleAddKey}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('keyName')}
                      </label>
                      <input
                        type="text"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('apiKey')}
                      </label>
                      <input
                        type="text"
                        value={keyValue}
                        onChange={(e) => setKeyValue(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {common('create')}
                    </button>
                  </form>
                </div>
                
                {/* Random Key Generation Form */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">{t('generateRandom')}</h3>
                  <form onSubmit={handleRandomGeneration}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('quantity')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={keyQuantity}
                        onChange={(e) => setKeyQuantity(parseInt(e.target.value, 10))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={generatingKeys}
                      className={`w-full ${
                        generatingKeys
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                    >
                      {generatingKeys ? common('loading') : t('generate')}
                    </button>
                  </form>
                </div>
              </div>
            </div>
            
            {/* API Keys Table */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {t('apiKeys')} ({apiKeys.length})
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    {t('manageKeys')}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                            />
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('keyName')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('apiKey')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('status')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('createdAt')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            {common('loading')}
                          </td>
                        </tr>
                      ) : apiKeys.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            {t('noKeys')}
                          </td>
                        </tr>
                      ) : (
                        apiKeys.map((key) => (
                          <tr key={key.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedKeys.includes(key.id)}
                                  onChange={() => toggleSelectKey(key.id)}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {key.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white font-mono flex items-center">
                                {formatKey(key.key, key.id)}
                                <button
                                  onClick={() => toggleKeyVisibility(key.id)}
                                  className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  {visibleKeys.includes(key.id) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 0 0-1.414 1.414l14 14a1 1 0 0 0 1.414-1.414l-14-14zm2.586 2.586a1 1 0 0 1 1.414 0l1.586 1.586a7.5 7.5 0 0 1 9.9 9.9l1.586 1.586a1 1 0 0 0 1.414-1.414l-1.586-1.586A9.958 9.958 0 0 0 20 10c0-2.818-1.18-5.233-2.783-7.108a1 1 0 0 0-1.435 0C13.18 4.767 10 7.182 10 10c0 .682.132 1.332.393 1.929l-1.414-1.414a7.5 7.5 0 0 1-7.414-7.414 9.979 9.979 0 0 0-1.879 1.582l-1.586 1.586a1 1 0 0 0 0 1.414z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                                      <path fillRule="evenodd" d="M10 3C5.5 3 2 7.36 2 10c0 2.64 3.5 7 8 7s8-4.36 8-7c0-2.64-3.5-7-8-7zm0 12c-3.36 0-6-3.36-6-5 0-1.64 2.64-5 6-5s6 3.36 6 5c0 1.64-2.64 5-6 5z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(key.key, key.id)}
                                  className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  {copiedKey === key.id ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M8 3a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1z" />
                                      <path d="M6 3a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2 3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                key.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                  : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              }`}>
                                {key.isActive ? t('active') : t('inactive')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(key.createdAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => toggleKeyStatus(key.id, key.isActive)}
                                className={`${
                                  key.isActive
                                    ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                                    : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                                }`}
                              >
                                {key.isActive ? t('deactivate') : t('activate')}
                              </button>
                              <button
                                onClick={() => deleteKey(key.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                {common('delete')}
                              </button>
                              <button
                                onClick={() => testApiKey(key)}
                                className={`text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ${
                                  testingKey === key.id ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                disabled={testingKey === key.id}
                              >
                                {testingKey === key.id ? common('loading') : t('test')}
                              </button>
                              {testResult && testResult.id === key.id && (
                                <span className={`ml-2 text-xs ${
                                  testResult.success ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {testResult.success
                                    ? `${t('testSuccess')} (${testResult.timeConsumed}ms)`
                                    : t('testFailed')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
                  <h3 className="text-xl font-semibold mb-4">{t('confirmDeleteTitle')}</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    {t('confirmDeleteText', { count: selectedKeys.length })}
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                    >
                      {common('cancel')}
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      {common('delete')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Toast notification */}
            {error && <Toast message={error} type="error" onClose={() => setError('')} />}
            {copiedKey && <Toast message={t('keyCopied')} type="success" onClose={() => setCopiedKey(null)} />}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 