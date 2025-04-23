'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { format, subDays } from 'date-fns';
import AuthGuard from "../../components/AuthGuard";
import Navigation from "../../components/Navigation";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useTranslations } from 'next-intl';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface ApiKey {
  id: string;
  name: string;
}

interface KeyMetrics {
  keyId: string;
  keyName: string;
  requests: number;
  tokens: number;
  models: {
    [model: string]: {
      requests: number;
      tokens: number;
    }
  }
}

interface DailyData {
  date: string;
  keys: KeyMetrics[];
}

export default function UsageDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usageData, setUsageData] = useState<DailyData[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  
  // 翻译
  const t = useTranslations('dashboard');
  const common = useTranslations('app.common');
  
  // Initialize state with default values
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Chart data
  const [dailyRequestsData, setDailyRequestsData] = useState<any[]>([]);
  const [dailyTokensData, setDailyTokensData] = useState<any[]>([]);
  const [modelDistributionData, setModelDistributionData] = useState<any[]>([]);
  const [keyDistributionData, setKeyDistributionData] = useState<any[]>([]);
  
  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      
      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching API keys');
    }
  };
  
  const fetchUsageData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedKeyId) params.append('keyId', selectedKeyId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedModel) params.append('model', selectedModel);
      
      const response = await fetch(`/api/keys/usage?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      
      const data = await response.json();
      setUsageData(data.data || []);
      setAvailableModels(data.models || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching usage data');
    } finally {
      setLoading(false);
    }
  }, [selectedKeyId, startDate, endDate, selectedModel]);
  
  const processChartData = useCallback(() => {
    // Process daily requests chart data
    interface ChartDataPoint {
      date: string;
      [key: string]: string | number;
    }
    
    const requestsData = usageData.map(day => {
      const dayData: ChartDataPoint = { date: day.date };
      day.keys.forEach(key => {
        dayData[key.keyName] = key.requests;
      });
      return dayData;
    });
    setDailyRequestsData(requestsData);
    
    // Process daily tokens chart data
    const tokensData = usageData.map(day => {
      const dayData: ChartDataPoint = { date: day.date };
      day.keys.forEach(key => {
        dayData[key.keyName] = key.tokens;
      });
      return dayData;
    });
    setDailyTokensData(tokensData);
    
    // Process model distribution data
    const modelData: { [model: string]: number } = {};
    usageData.forEach(day => {
      day.keys.forEach(key => {
        Object.entries(key.models).forEach(([model, metrics]) => {
          if (!modelData[model]) modelData[model] = 0;
          modelData[model] += metrics.requests;
        });
      });
    });
    
    const formattedModelData = Object.entries(modelData).map(([model, requests]) => ({
      model,
      requests
    }));
    setModelDistributionData(formattedModelData);
    
    // Process key distribution data
    const keyData: { [key: string]: number } = {};
    usageData.forEach(day => {
      day.keys.forEach(key => {
        if (!keyData[key.keyName]) keyData[key.keyName] = 0;
        keyData[key.keyName] += key.requests;
      });
    });
    
    const formattedKeyData = Object.entries(keyData).map(([keyName, requests]) => ({
      keyName,
      requests
    }));
    setKeyDistributionData(formattedKeyData);
  }, [usageData]);
  
  // Fetch API keys on initial load
  useEffect(() => {
    if (session) {
      fetchApiKeys();
    }
  }, [session]);
  
  // Fetch usage data when filters change
  useEffect(() => {
    if (session) {
      fetchUsageData();
    }
  }, [session, fetchUsageData]);
  
  // Process data for charts when raw data changes
  useEffect(() => {
    processChartData();
  }, [processChartData]);
  
  const getRandomColor = (index: number) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', 
      '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
    ];
    return colors[index % colors.length];
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-grow p-8">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">{t('usage.title')}</h1>
              <LanguageSwitcher />
            </div>
            
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-4">{t('usage.filters')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={selectedKeyId}
                    onChange={(e) => setSelectedKeyId(e.target.value)}
                  >
                    <option value="">{common('loading')}</option>
                    {apiKeys.map((key) => (
                      <option key={key.id} value={key.id}>{key.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('usage.startDate')}
                  </label>
                  <input
                    type="date"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('usage.endDate')}
                  </label>
                  <input
                    type="date"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('usage.model')}
                  </label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="">{common('loading')}</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => fetchUsageData()}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  {common('view')}
                </button>
              </div>
            </div>
            
            {/* Usage Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SummaryCard 
                title={t('usage.requestTotal')}
                value={usageData.reduce((sum, day) => 
                  sum + day.keys.reduce((keySum, key) => keySum + key.requests, 0), 0).toLocaleString()}
                icon="🔄"
              />
              <SummaryCard 
                title={t('usage.tokenTotal')}
                value={usageData.reduce((sum, day) => 
                  sum + day.keys.reduce((keySum, key) => keySum + key.tokens, 0), 0).toLocaleString()}
                icon="📊"
              />
              <SummaryCard 
                title={t('usage.activeKeys')}
                value={Object.keys(keyDistributionData.reduce((acc, item) => {
                  acc[item.keyName] = true;
                  return acc;
                }, {} as Record<string, boolean>)).length.toString()}
                icon="🔑"
              />
              <SummaryCard 
                title={t('usage.modelCount')}
                value={modelDistributionData.length.toString()}
                icon="🤖"
              />
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">{t('usage.dailyRequests')}</h2>
                <div className="h-80">
                  {dailyRequestsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyRequestsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {Object.keys(dailyRequestsData[0] || {})
                          .filter(key => key !== 'date')
                          .map((key, index) => (
                            <Line 
                              key={key}
                              type="monotone" 
                              dataKey={key} 
                              stroke={getRandomColor(index)}
                              activeDot={{ r: 8 }}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {loading ? common('loading') : t('usage.noData')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">{t('usage.dailyTokens')}</h2>
                <div className="h-80">
                  {dailyTokensData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyTokensData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {Object.keys(dailyTokensData[0] || {})
                          .filter(key => key !== 'date')
                          .map((key, index) => (
                            <Line 
                              key={key}
                              type="monotone" 
                              dataKey={key} 
                              stroke={getRandomColor(index)}
                              activeDot={{ r: 8 }}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {loading ? common('loading') : t('usage.noData')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">{t('usage.modelDistribution')}</h2>
                <div className="h-80">
                  {modelDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modelDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="model" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="requests" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {loading ? common('loading') : t('usage.noData')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">{t('usage.keyUsage')}</h2>
                <div className="h-80">
                  {keyDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={keyDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="keyName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="requests" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {loading ? common('loading') : t('usage.noData')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
}

function SummaryCard({ title, value, icon }: SummaryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div className="text-3xl mr-4">{icon}</div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
} 