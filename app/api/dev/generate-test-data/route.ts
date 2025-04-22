import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';

// 仅在开发环境中可用
const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  // 检查是否为开发环境
  if (!isDevelopment) {
    return NextResponse.json(
      { success: false, message: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  try {
    // 获取请求参数
    const { days = 30, keysPerDay = 5, requestsPerKey = 10, tokensPerRequest = 1000 } = await request.json();
    
    // 限制生成数量，防止数据库过载
    const maxDays = Math.min(days, 90);
    const maxKeysPerDay = Math.min(keysPerDay, 20);
    const maxRequestsPerKey = Math.min(requestsPerKey, 50);
    
    // 检查用户认证
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 连接数据库
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');
    const keysCollection = db.collection('apiKeys');
    const usageCollection = db.collection('apiUsage');
    
    // 获取用户ID
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // 获取用户的API Keys
    const keys = await keysCollection.find({ userId: user._id }).toArray();
    
    if (keys.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No API keys found for this user' },
        { status: 404 }
      );
    }
    
    // 可用的模型列表
    const models = [
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo',
      'claude-3-opus',
      'claude-3-sonnet',
      'gemini-pro',
      'llama-3'
    ];
    
    // 生成测试数据
    const testData = [];
    const now = new Date();
    
    for (let day = 0; day < maxDays; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      
      // 随机选择当天要使用的Keys
      const dayKeys = keys.slice(0, Math.min(maxKeysPerDay, keys.length));
      
      for (const key of dayKeys) {
        // 为每个Key生成随机请求数量
        const requestCount = Math.floor(Math.random() * maxRequestsPerKey) + 1;
        
        for (let req = 0; req < requestCount; req++) {
          // 随机选择一个模型
          const model = models[Math.floor(Math.random() * models.length)];
          
          // 随机生成token使用量
          const tokensInput = Math.floor(Math.random() * tokensPerRequest);
          const tokensOutput = Math.floor(Math.random() * (tokensPerRequest * 1.5));
          
          // 随机状态码 (大部分成功，少量失败)
          const status = Math.random() > 0.95 ? 429 : 200;
          
          // 随机延迟时间 (200ms - 2000ms)
          const latency = Math.floor(Math.random() * 1800) + 200;
          
          // 创建使用记录
          const timestamp = new Date(date);
          timestamp.setHours(Math.floor(Math.random() * 24));
          timestamp.setMinutes(Math.floor(Math.random() * 60));
          timestamp.setSeconds(Math.floor(Math.random() * 60));
          
          const usageRecord = {
            keyId: key._id,
            userId: user._id,
            timestamp,
            endpoint: '/v1/chat/completions',
            model,
            tokensInput,
            tokensOutput,
            latency,
            status,
            ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          };
          
          testData.push(usageRecord);
        }
        
        // 更新Key的统计信息
        const totalRequests = testData.filter(d => d.keyId.toString() === key._id.toString()).length;
        const totalTokens = testData
          .filter(d => d.keyId.toString() === key._id.toString())
          .reduce((sum, record) => sum + record.tokensInput + record.tokensOutput, 0);
        
        await keysCollection.updateOne(
          { _id: key._id },
          { 
            $set: {
              'usage.lastUsed': new Date(),
              'usage.requests': totalRequests,
              'usage.tokens': totalTokens
            }
          }
        );
      }
    }
    
    // 批量插入所有测试数据
    if (testData.length > 0) {
      await usageCollection.insertMany(testData);
    }
    
    return NextResponse.json({
      success: true,
      message: `Generated ${testData.length} test data records over ${maxDays} days`,
      stats: {
        records: testData.length,
        days: maxDays,
        keys: Math.min(maxKeysPerDay, keys.length)
      }
    });
    
  } catch (error) {
    console.error('Error generating test data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate test data' },
      { status: 500 }
    );
  }
} 