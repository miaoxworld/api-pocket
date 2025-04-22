import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const keyId = searchParams.get('keyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const model = searchParams.get('model');
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const usageCollection = db.collection('apiUsage');
    const keysCollection = db.collection('apiKeys');
    const usersCollection = db.collection('users');
    
    // Get user ID from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Build query
    interface QueryType {
      userId: ObjectId;
      keyId?: ObjectId | { $in: ObjectId[] };
      timestamp?: {
        $gte?: Date;
        $lte?: Date;
      };
      model?: string;
    }
    
    const query: QueryType = { userId: user._id };
    
    // Add filters if provided
    if (keyId) {
      query.keyId = new ObjectId(keyId);
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    if (model) {
      query.model = model;
    }
    
    // Get user's API keys
    const keys = await keysCollection.find({ userId: user._id }).toArray();
    const keyIds = keys.map(key => key._id);
    
    // If no specific key is requested, include all user's keys
    if (!keyId) {
      query.keyId = { $in: keyIds };
    }
    
    // Get usage data
    const usageData = await usageCollection.find(query).toArray();
    
    // Get key name mapping
    interface KeyMap {
      [key: string]: string;
    }
    
    const keyMap: KeyMap = keys.reduce((acc: KeyMap, key) => {
      acc[key._id.toString()] = key.name;
      return acc;
    }, {});
    
    // Aggregate data by day and key
    interface ModelMetrics {
      requests: number;
      tokens: number;
    }
    
    interface KeyMetrics {
      requests: number;
      tokens: number;
      models: {
        [model: string]: ModelMetrics;
      };
    }
    
    interface AggregatedData {
      [date: string]: {
        [keyId: string]: KeyMetrics;
      };
    }
    
    const aggregatedData: AggregatedData = {};
    const modelsList: Set<string> = new Set();
    
    usageData.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      const keyIdString = entry.keyId.toString();
      
      if (!aggregatedData[date]) {
        aggregatedData[date] = {};
      }
      
      if (!aggregatedData[date][keyIdString]) {
        aggregatedData[date][keyIdString] = {
          requests: 0,
          tokens: 0,
          models: {}
        };
      }
      
      aggregatedData[date][keyIdString].requests += 1;
      aggregatedData[date][keyIdString].tokens += (entry.tokensInput || 0) + (entry.tokensOutput || 0);
      
      if (entry.model) {
        modelsList.add(entry.model);
        if (!aggregatedData[date][keyIdString].models[entry.model]) {
          aggregatedData[date][keyIdString].models[entry.model] = {
            requests: 0,
            tokens: 0
          };
        }
        aggregatedData[date][keyIdString].models[entry.model].requests += 1;
        aggregatedData[date][keyIdString].models[entry.model].tokens += 
          (entry.tokensInput || 0) + (entry.tokensOutput || 0);
      }
    });
    
    // Format the response
    const formattedData = Object.entries(aggregatedData).map(([date, keyData]: [string, {[keyId: string]: KeyMetrics}]) => {
      const keyMetrics = Object.entries(keyData).map(([keyId, metrics]: [string, KeyMetrics]) => ({
        keyId,
        keyName: keyMap[keyId] || 'Unknown Key',
        ...metrics
      }));
      
      return {
        date,
        keys: keyMetrics
      };
    });
    
    return NextResponse.json({
      success: true,
      data: formattedData,
      models: Array.from(modelsList)
    });
  } catch (error) {
    console.error('Error fetching API usage data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch API usage data' },
      { status: 500 }
    );
  }
} 