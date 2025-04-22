'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navigation from "./components/Navigation";
import Link from "next/link";
import AuthGuard from "./components/AuthGuard";

interface DashboardStats {
  endpoints: {
    total: number;
    active: number;
  };
  keys: {
    total: number;
    active: number;
  };
  usage: {
    requests: number;
    tokens: number;
  };
  models: Array<{
    name: string;
    requests: number;
    tokens: number;
  }>;
  users: number;
}

export default function Home() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      fetchDashboardStats();
    }
  }, [session]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      
      const data = await response.json();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching dashboard statistics');
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
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard 
                title="Total APIs" 
                value={loading ? "Loading..." : stats ? stats.endpoints.total.toString() : "0"} 
                description="OpenAI compatible APIs" 
                icon="🌐" 
              />
              <DashboardCard 
                title="Active APIs" 
                value={loading ? "Loading..." : stats ? stats.endpoints.active.toString() : "0"} 
                description="Currently enabled APIs" 
                icon="✅" 
              />
              <DashboardCard 
                title="API Keys" 
                value={loading ? "Loading..." : stats ? stats.keys.total.toString() : "0"} 
                description="Generated API keys" 
                icon="🔑" 
              />
              <DashboardCard 
                title="Total Requests" 
                value={loading ? "Loading..." : stats ? stats.usage.requests.toLocaleString() : "0"} 
                description="API requests processed" 
                icon="🔄" 
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Recent API Activity</h2>
                {loading ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Loading...
                  </div>
                ) : stats && stats.usage.requests > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Total Requests</span>
                      <span className="font-medium">{stats.usage.requests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Total Tokens</span>
                      <span className="font-medium">{stats.usage.tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Active API Keys</span>
                      <span className="font-medium">{stats.keys.active.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No recent activity
                  </div>
                )}
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">API Status</h2>
                {loading ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Loading...
                  </div>
                ) : stats && stats.endpoints.total > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Active APIs</span>
                      <span className="font-medium">{stats.endpoints.active} / {stats.endpoints.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Models Used</span>
                      <span className="font-medium">{stats.models.length}</span>
                    </div>
                    {stats.models.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Popular Models:</h3>
                        <ul className="space-y-2">
                          {stats.models.slice(0, 3).map((model, index) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                              <span>{model.name}</span>
                              <span>{model.requests.toLocaleString()} requests</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No APIs configured
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">API 使用量统计</h2>
                <Link href="/usage-dashboard" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  查看详细统计 &rarr;
                </Link>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">查看并分析您的API密钥使用情况，包括请求量、Token使用量、模型分布等数据。</p>
              
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">加载中...</p>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">请求总量</p>
                    <p className="text-2xl font-bold">{stats.usage.requests.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Token 总量</p>
                    <p className="text-2xl font-bold">{stats.usage.tokens.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">活跃 API Key</p>
                    <p className="text-2xl font-bold">{stats.keys.active.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">使用的模型数</p>
                    <p className="text-2xl font-bold">{stats.models.length.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">请求总量</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Token 总量</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">活跃 API Key</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">使用的模型数</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  icon: string;
}

function DashboardCard({ title, value, description, icon }: DashboardCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div className="text-3xl mr-4">{icon}</div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}
