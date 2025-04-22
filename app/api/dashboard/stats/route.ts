import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');
    const apisCollection = db.collection('endpoints');
    const keysCollection = db.collection('apiKeys');
    const usageCollection = db.collection('apiUsage');
    
    // Get user ID from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get API statistics
    const totalApis = await apisCollection.countDocuments({ userId: user._id });
    const activeApis = await apisCollection.countDocuments({ userId: user._id, isActive: true });
    
    // Get API key statistics
    const keys = await keysCollection.find({ userId: user._id }).toArray();
    const totalKeys = keys.length;
    const activeKeys = keys.filter(key => key.isActive).length;
    
    // Aggregate total usage
    const totalRequests = keys.reduce((sum, key) => sum + (key.usage?.requests || 0), 0);
    const totalTokens = keys.reduce((sum, key) => sum + (key.usage?.tokens || 0), 0);
    
    // Get usage statistics by model
    const modelStats = await usageCollection.aggregate([
      { $match: { userId: user._id } },
      { $group: {
          _id: "$model",
          requests: { $sum: 1 },
          tokens: { $sum: { $add: ["$tokensInput", "$tokensOutput"] } }
        }
      }
    ]).toArray();
    
    // Get active users (if user is admin)
    let totalUsers = 0;
    if (user.role === 'admin') {
      totalUsers = await usersCollection.countDocuments({});
    }
    
    // Format the response
    return NextResponse.json({
      success: true,
      stats: {
        endpoints: {
          total: totalApis,
          active: activeApis
        },
        keys: {
          total: totalKeys,
          active: activeKeys
        },
        usage: {
          requests: totalRequests,
          tokens: totalTokens
        },
        models: modelStats.map(model => ({
          name: model._id || 'Unknown',
          requests: model.requests,
          tokens: model.tokens
        })),
        users: totalUsers
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
} 