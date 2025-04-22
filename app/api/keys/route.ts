import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Get all API keys
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
    const keysCollection = db.collection('apiKeys');
    
    // Get user ID from session
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all keys for this user
    const keys = await keysCollection.find({ userId: user._id }).toArray();
    
    // Format the response
    const formattedKeys = keys.map(key => ({
      id: key._id.toString(),
      name: key.name,
      key: key.key,
      isActive: key.isActive,
      createdAt: key.createdAt,
      usage: key.usage || { requests: 0, tokens: 0, lastUsed: null }
    }));
    
    return NextResponse.json({
      success: true,
      keys: formattedKeys
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// Create a new API key
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { name, key } = body;
    
    // Validate required fields
    if (!name || !key) {
      return NextResponse.json(
        { success: false, message: 'Name and key are required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
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
    
    // Check if key already exists
    const existingKey = await keysCollection.findOne({ key });
    if (existingKey) {
      return NextResponse.json(
        { success: false, message: 'API key already exists' },
        { status: 409 }
      );
    }
    
    // Create new API key
    const now = new Date();
    const newKey = {
      _id: new ObjectId(),
      name,
      key,
      userId: user._id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      usage: {
        requests: 0,
        tokens: 0,
        lastUsed: null
      }
    };
    
    await keysCollection.insertOne(newKey);
    
    // Return the created key
    return NextResponse.json({
      success: true,
      key: {
        id: newKey._id.toString(),
        name: newKey.name,
        key: newKey.key,
        isActive: newKey.isActive,
        createdAt: newKey.createdAt,
        usage: newKey.usage
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create API key' },
      { status: 500 }
    );
  }
} 