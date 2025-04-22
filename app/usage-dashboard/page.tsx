'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { format, subDays } from 'date-fns';
import AuthGuard from "../components/AuthGuard";
import Navigation from "../components/Navigation";
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
            <h1 className="text-3xl font-bold mb-6">API 使用量仪表板</h1>
            
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-4">筛选条件</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <select
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={selectedKeyId}
                    onChange={(e) => setSelectedKeyId(e.target.value)}
                  >
                    <option value="">所有 API Keys</option>
                    {apiKeys.map(key => (
                      <option key={key.id} value={key.id}>{key.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    结束日期
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    模型
                  </label>
                  <select
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="">所有模型</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-red-500">{error}</p>
              </div>
            ) : usageData.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">没有找到使用数据</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <SummaryCard 
                    title="总请求数" 
                    value={dailyRequestsData.reduce((sum, day) => {
                      const dayTotal = Object.entries(day)
                        .filter(([key]) => key !== 'date')
                        .reduce((daySum, [, val]) => daySum + (val as number), 0);
                      return sum + dayTotal;
                    }, 0).toLocaleString()} 
                    icon="🔄" 
                  />
                  <SummaryCard 
                    title="总 Token 数" 
                    value={dailyTokensData.reduce((sum, day) => {
                      const dayTotal = Object.entries(day)
                        .filter(([key]) => key !== 'date')
                        .reduce((daySum, [, val]) => daySum + (val as number), 0);
                      return sum + dayTotal;
                    }, 0).toLocaleString()} 
                    icon="📝" 
                  />
                  <SummaryCard 
                    title="使用的 API Keys" 
                    value={keyDistributionData.length.toString()} 
                    icon="🔑" 
                  />
                  <SummaryCard 
                    title="使用的模型" 
                    value={modelDistributionData.length.toString()} 
                    icon="🤖" 
                  />
                </div>
                
                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Daily Requests Chart */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">每日请求数</h2>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={dailyRequestsData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {apiKeys
                            .filter(key => !selectedKeyId || key.id === selectedKeyId)
                            .map((key, index) => (
                              <Line 
                                key={key.id}
                                type="monotone" 
                                dataKey={key.name} 
                                stroke={getRandomColor(index)} 
                                activeDot={{ r: 8 }} 
                              />
                            ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Daily Tokens Chart */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">每日 Token 使用量</h2>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={dailyTokensData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {apiKeys
                            .filter(key => !selectedKeyId || key.id === selectedKeyId)
                            .map((key, index) => (
                              <Line 
                                key={key.id}
                                type="monotone" 
                                dataKey={key.name} 
                                stroke={getRandomColor(index)} 
                                activeDot={{ r: 8 }} 
                              />
                            ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Model Distribution Chart */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">模型分布</h2>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={modelDistributionData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="requests" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Key Distribution Chart */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">API Key 分布</h2>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={keyDistributionData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="keyName" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="requests" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
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