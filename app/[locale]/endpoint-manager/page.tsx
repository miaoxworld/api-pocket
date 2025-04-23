'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import AuthGuard from "../../components/AuthGuard";
import Navigation from "../../components/Navigation";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import Toast from '../../components/Toast';
import { useTranslations } from 'next-intl';

interface Endpoint {
  id: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
  models: string[];
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EndpointManager() {
  return (
    <AuthGuard>
      <EndpointManagerContent />
    </AuthGuard>
  );
}

function EndpointManagerContent() {
  const { data: session } = useSession();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<Endpoint | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{id: string, success: boolean, message: string, timeConsumed?: number} | null>(null);
  const [savedModels, setSavedModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [newModel, setNewModel] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: ''
  });

  // 翻译
  const t = useTranslations('endpoints');
  const common = useTranslations('app.common');

  // Fetch endpoints
  useEffect(() => {
    if (session) {
      fetchEndpoints();
      fetchSavedModels();
    }
  }, [session]);

  const fetchSavedModels = async () => {
    try {
      const response = await fetch('/api/user/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setSavedModels(data.models || []);
    } catch (err: any) {
      console.error('Error fetching models:', err);
    }
  };

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/endpoints');
      
      if (!response.ok) {
        throw new Error('Failed to fetch endpoints');
      }
      
      const data = await response.json();
      setEndpoints(data.endpoints || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching endpoints');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedModels(selectedOptions);
  };
  
  const handleAddModel = () => {
    if (newModel.trim() && !selectedModels.includes(newModel.trim())) {
      setSelectedModels(prev => [...prev, newModel.trim()]);
      setNewModel('');
    }
  };
  
  const handleRemoveModel = (model: string) => {
    setSelectedModels(prev => prev.filter(m => m !== model));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      baseUrl: '',
      apiKey: ''
    });
    setSelectedModels([]);
    setNewModel('');
    setCurrentEndpoint(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (endpoint: Endpoint) => {
    setCurrentEndpoint(endpoint);
    setFormData({
      name: endpoint.name,
      baseUrl: endpoint.baseUrl,
      apiKey: ''  // API key is not displayed for editing
    });
    setSelectedModels(endpoint.models || []);
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const endpointData = {
        name: formData.name,
        baseUrl: formData.baseUrl,
        models: selectedModels,
        apiKey: formData.apiKey
      };
      
      const response = await fetch('/api/endpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(endpointData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add endpoint');
      }
      
      setShowAddModal(false);
      resetForm();
      await fetchEndpoints();
      await fetchSavedModels();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEndpoint) return;
    
    try {
      const endpointData = {
        name: formData.name,
        baseUrl: formData.baseUrl,
        models: selectedModels
      };
      
      const response = await fetch(`/api/endpoints/${currentEndpoint.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(endpointData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update endpoint');
      }
      
      setShowEditModal(false);
      resetForm();
      await fetchEndpoints();
      await fetchSavedModels();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const toggleEndpointStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/endpoints/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update endpoint status');
      }
      
      fetchEndpoints();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const deleteEndpoint = async (id: string) => {
    if (!confirm(t('confirmDelete'))) {
      return;
    }
    
    try {
      const response = await fetch(`/api/endpoints/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete endpoint');
      }
      
      fetchEndpoints();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const testEndpoint = async (endpoint: Endpoint) => {
    try {
      setTestingEndpoint(endpoint.id);
      setTestResult(null);
      
      // Test endpoint models
      const response = await fetch(`/api/endpoints/${endpoint.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      setTestResult({
        id: endpoint.id,
        success: data.success,
        message: data.message,
        timeConsumed: data.timeConsumed
      });
    } catch (err: any) {
      setTestResult({
        id: endpoint.id,
        success: false,
        message: err.message || 'Test failed due to an unexpected error.'
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow p-8">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
              <button 
                onClick={openAddModal} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                {t('createEndpoint')}
              </button>
            </div>
          </div>
          
          {/* Error Toast */}
          {error && <Toast message={error} type="error" onClose={() => setError('')} />}
          
          {/* Test Result Toast */}
          {testResult && (
            <Toast 
              message={`${testResult.success ? t('connectionSuccess') : t('connectionFailed')}: ${testResult.message}${testResult.timeConsumed ? ` (${testResult.timeConsumed}ms)` : ''}`}
              type={testResult.success ? 'success' : 'error'}
              onClose={() => setTestResult(null)}
            />
          )}
          
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('title')}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('endpointName')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('baseUrl')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('status')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Models
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {endpoints.length === 0 ? (
                      <tr className="text-center">
                        <td colSpan={5} className="px-6 py-12 text-gray-500 dark:text-gray-400">
                          {loading ? common('loading') : t('noEndpoints')}
                        </td>
                      </tr>
                    ) : (
                      endpoints.map((endpoint) => (
                        <tr key={endpoint.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{endpoint.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">{endpoint.baseUrl}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              endpoint.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {endpoint.isActive ? t('active') : t('inactive')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {endpoint.models.join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal(endpoint)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                            >
                              {common('edit')}
                            </button>
                            <button
                              onClick={() => toggleEndpointStatus(endpoint.id, endpoint.isActive)}
                              className={`${
                                endpoint.isActive
                                  ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                  : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                              } mr-3`}
                            >
                              {endpoint.isActive ? t('deactivate') : t('activate')}
                            </button>
                            <button
                              onClick={() => testEndpoint(endpoint)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                              disabled={testingEndpoint === endpoint.id}
                            >
                              {testingEndpoint === endpoint.id ? common('loading') : t('test')}
                            </button>
                            <button
                              onClick={() => deleteEndpoint(endpoint.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              {common('delete')}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Add Endpoint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">{t('createNewEndpoint')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="name">
                  {t('endpointName')}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="My Endpoint"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="baseUrl">
                  {t('baseUrl')}
                </label>
                <input
                  type="url"
                  id="baseUrl"
                  name="baseUrl"
                  value={formData.baseUrl}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="https://api.example.com"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="apiKey">
                  {t('apiKey')}
                </label>
                <input
                  type="password"
                  id="apiKey"
                  name="apiKey"
                  value={formData.apiKey}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="models">
                  {t('modelMapping')}
                </label>
                <div className="flex flex-col space-y-2">
                  <select
                    id="models"
                    multiple
                    value={selectedModels}
                    onChange={handleModelSelect}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline h-32"
                  >
                    {savedModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Hold Ctrl (Windows) or Command (Mac) to select multiple models
                  </div>
                  <div className="flex items-center mt-2">
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Add new model"
                      className="shadow appearance-none border rounded flex-grow py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <button
                      type="button"
                      onClick={handleAddModel}
                      className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                      {common('create')}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedModels.map(model => (
                      <div key={model} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded flex items-center">
                        <span>{model}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveModel(model)}
                          className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {common('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {common('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Endpoint Modal */}
      {showEditModal && currentEndpoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">{t('editEndpoint')}</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="edit-name">
                  {t('endpointName')}
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="edit-baseUrl">
                  {t('baseUrl')}
                </label>
                <input
                  type="url"
                  id="edit-baseUrl"
                  name="baseUrl"
                  value={formData.baseUrl}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="edit-models">
                  {t('modelMapping')}
                </label>
                <div className="flex flex-col space-y-2">
                  <select
                    id="edit-models"
                    multiple
                    value={selectedModels}
                    onChange={handleModelSelect}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline h-32"
                  >
                    {savedModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Hold Ctrl (Windows) or Command (Mac) to select multiple models
                  </div>
                  <div className="flex items-center mt-2">
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Add new model"
                      className="shadow appearance-none border rounded flex-grow py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <button
                      type="button"
                      onClick={handleAddModel}
                      className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                      {common('create')}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedModels.map(model => (
                      <div key={model} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded flex items-center">
                        <span>{model}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveModel(model)}
                          className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {common('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {common('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 