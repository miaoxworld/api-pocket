import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import * as crypto from 'crypto';

// Generate random API keys
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
    const { quantity } = body;
    
    // Validate quantity
    const keyQuantity = parseInt(quantity);
    if (isNaN(keyQuantity) || keyQuantity < 1 || keyQuantity > 100) {
      return NextResponse.json(
        { success: false, message: 'Quantity must be between 1 and 100' },
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
    
    // Generate random API keys
    const generatedKeys = [];
    const now = new Date();
    
    for (let i = 0; i < keyQuantity; i++) {
      let key;
      let isUnique = false;
      
      // Keep generating until we find a unique key
      while (!isUnique) {
        // Generate a random key
        key = generateRandomKey();
        
        // Check if the key already exists
        const existingKey = await keysCollection.findOne({ key });
        if (!existingKey) {
          isUnique = true;
        }
      }
      
      // Create new key document
      const newKey = {
        _id: new ObjectId(),
        name: `Global Key ${i + 1}`,
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
      
      generatedKeys.push(newKey);
    }
    
    // Insert all generated keys
    if (generatedKeys.length > 0) {
      await keysCollection.insertMany(generatedKeys);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `${generatedKeys.length} API keys generated successfully`,
      count: generatedKeys.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating API keys:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate API keys' },
      { status: 500 }
    );
  }
}

// Helper function to generate a random API key
function generateRandomKey(length = 32) {
  // Generate a secure random string using crypto
  const bytes = crypto.randomBytes(length);
  
  // Convert to a base64 string and remove non-alphanumeric characters
  return bytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .slice(0, length);
} 