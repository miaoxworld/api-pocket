'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AuthGuard from "../components/AuthGuard";
import Navigation from "../components/Navigation";
import Toast from '../components/Toast';

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
        throw new Error(errorData.message || 'Failed to delete API key');
      }
      
      fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  const toggleSelectKey = (id: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(id)) {
        return prev.filter(keyId => keyId !== id);
      } else {
        return [...prev, id];
      }
    });
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
      const response = await fetch('/api/keys/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedKeys })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete API keys');
      }
      
      setShowDeleteModal(false);
      setSelectedKeys([]);
      setSelectAll(false);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };
  
  // Format the key for display (mask it)
  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const handleRandomGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (keyQuantity < 1 || keyQuantity > 100) {
      setError('Please select a quantity between 1 and 100');
      return;
    }
    
    try {
      setGeneratingKeys(true);
      const response = await fetch('/api/keys/random', {
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
        throw new Error(errorData.message || 'Failed to generate API keys');
      }
      
      // Fetch updated keys
      fetchApiKeys();
      setKeyQuantity(1);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setGeneratingKeys(false);
    }
  };

  // 复制API key到剪贴板
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedKey(id);
      },
      (err) => {
        console.error('Could not copy API key: ', err);
      }
    );
  };

  // 新增函数：切换API key的可见性
  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => 
      prev.includes(id) 
        ? prev.filter(keyId => keyId !== id) 
        : [...prev, id]
    );
  };

  // 格式化API key显示 - 根据可见性状态显示完整或掩码
  const formatKey = (key: string, id: string) => {
    if (visibleKeys.includes(id)) {
      return key;
    }
    return maskKey(key);
  };
  
  // 测试API Key
  const testApiKey = async (key: ApiKey) => {
    try {
      setTestingKey(key.id);
      setTestResult(null);
      
      // 发送请求到本地测试端点
      const response = await fetch('/api/keys/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.key}`
        },
        body: JSON.stringify({
          keyId: key.id
        })
      });
      
      const data = await response.json();
      
      setTestResult({
        id: key.id,
        success: data.success,
        message: data.message || (data.success ? 'Key is working correctly!' : 'Key test failed.'),
        timeConsumed: data.timeConsumed
      });
    } catch (err: any) {
      setTestResult({
        id: key.id,
        success: false,
        message: err.message || 'Test failed due to an unexpected error.'
      });
    } finally {
      setTestingKey(null);
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-grow p-8">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">API Keys Management</h1>
              <div className="flex space-x-3">
                {selectedKeys.length > 0 && (
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                  >
                    Delete Selected ({selectedKeys.length})
                  </button>
                )}
              </div>
            </div>
              
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            {/* Toast notification for test results */}
            {testResult && (
              <Toast 
                message={testResult.message}
                type={testResult.success ? 'success' : 'error'}
                isVisible={testResult !== null}
                onClose={() => setTestResult(null)}
                timeConsumed={testResult.timeConsumed}
              />
            )}
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold">Client API Keys</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Manage API keys provided to your clients for accessing your OpenAI compatible services
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            <input 
                              type="checkbox" 
                              checked={selectAll}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Name/Label
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Key (Masked)
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Usage
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {apiKeys.length === 0 ? (
                          <tr className="text-center">
                            <td colSpan={7} className="px-6 py-12 text-gray-500 dark:text-gray-400">
                              No API keys added yet. Use the forms below to add keys.
                            </td>
                          </tr>
                        ) : (
                          apiKeys.map((key) => (
                            <tr key={key.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input 
                                  type="checkbox" 
                                  checked={selectedKeys.includes(key.id)}
                                  onChange={() => toggleSelectKey(key.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{formatKey(key.key, key.id)}</div>
                                <div className="flex mt-1">
                                  <button
                                    onClick={() => toggleKeyVisibility(key.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 mr-3"
                                  >
                                    {visibleKeys.includes(key.id) ? 'Hide' : 'Show'}
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(key.key, key.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    {copiedKey === key.id ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  key.isActive
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {key.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {key.usage.requests} req / {key.usage.tokens} tokens
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  {key.usage.lastUsed ? new Date(key.usage.lastUsed).toLocaleString() : 'Never used'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => toggleKeyStatus(key.id, key.isActive)}
                                  className={`${
                                    key.isActive
                                      ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                      : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                  } mr-3`}
                                >
                                  {key.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => testApiKey(key)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                                  disabled={testingKey === key.id || !key.isActive}
                                >
                                  {testingKey === key.id ? 'Testing...' : 'Test'}
                                </button>
                                <button
                                  onClick={() => deleteKey(key.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Single Key Addition</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Add individual API keys with specific settings
                    </p>
                    <form onSubmit={handleAddKey} className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Key Name/Label
                        </label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter a name for this key"
                          value={keyName}
                          onChange={(e) => setKeyName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          API Key
                        </label>
                        <input 
                          type="password" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter API key"
                          value={keyValue}
                          onChange={(e) => setKeyValue(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Add Key
                        </button>
                      </div>
                    </form>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Bulk Import</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Add multiple API keys at once by pasting a list (one key per line)
                    </p>
                    <form onSubmit={handleBulkImport} className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Keys (One per line)
                        </label>
                        <textarea 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-32"
                          placeholder="Paste your API keys here, one per line"
                          value={bulkKeys}
                          onChange={(e) => setBulkKeys(e.target.value)}
                          required
                        ></textarea>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Import Keys
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Generate Random Keys</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Generate 1-100 random API keys at once for the selected API
                    </p>
                    <form onSubmit={handleRandomGeneration} className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Quantity (1-100)
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={keyQuantity}
                          onChange={(e) => setKeyQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                          disabled={generatingKeys}
                        >
                          {generatingKeys ? 'Generating...' : 'Generate Keys'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Bulk Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Confirm Deletion</h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Are you sure you want to delete {selectedKeys.length} selected API key(s)? This action cannot be undone.
              </p>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 