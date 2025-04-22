import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Bulk import API keys
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
    const { keys } = body;
    
    // Validate required fields
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one key is required' },
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
    
    // Filter out duplicate keys
    const uniqueKeys = [...new Set(keys.map(k => k.trim()))].filter(k => k !== '');
    
    // Check if any keys already exist
    const existingKeys = await keysCollection.find({ 
      key: { $in: uniqueKeys } 
    }).toArray();
    
    if (existingKeys.length > 0) {
      const existingKeyValues = existingKeys.map(k => k.key);
      const newUniqueKeys = uniqueKeys.filter(k => !existingKeyValues.includes(k));
      
      if (newUniqueKeys.length === 0) {
        return NextResponse.json(
          { success: false, message: 'All provided keys already exist' },
          { status: 409 }
        );
      }
      
      // Update uniqueKeys to only include non-existing keys
      uniqueKeys.length = 0;
      uniqueKeys.push(...newUniqueKeys);
    }
    
    // Create API keys
    const now = new Date();
    const newKeys = uniqueKeys.map((key, index) => ({
      _id: new ObjectId(),
      name: `Imported Key ${index + 1}`,
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
    }));
    
    if (newKeys.length > 0) {
      await keysCollection.insertMany(newKeys);
    }
    
    return NextResponse.json({
      success: true,
      message: `${newKeys.length} API keys imported successfully${
        uniqueKeys.length !== keys.length ? `, ${keys.length - uniqueKeys.length} duplicates skipped` : ''
      }`,
      count: newKeys.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing API keys:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to import API keys' },
      { status: 500 }
    );
  }
} 