import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Get a single API key
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Await the params object before destructuring
    const { id } = await params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid key ID' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const keysCollection = db.collection('apiKeys');
    const apisCollection = db.collection('endpoints');
    const usersCollection = db.collection('users');
    
    // Get user ID from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find key
    const key = await keysCollection.findOne({ 
      _id: new ObjectId(id),
      userId: user._id
    });
    
    if (!key) {
      return NextResponse.json(
        { success: false, message: 'API key not found' },
        { status: 404 }
      );
    }
    
    // Return the key
    return NextResponse.json({
      success: true,
      key: {
        id: key._id.toString(),
        name: key.name,
        key: key.key,
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        usage: key.usage || { requests: 0, tokens: 0, lastUsed: null }
      }
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch API key' },
      { status: 500 }
    );
  }
}

// Update an API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Await the params object before destructuring
    const { id } = await params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid key ID' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { name } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required' },
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
    
    // Check if key exists
    const key = await keysCollection.findOne({ 
      _id: new ObjectId(id),
      userId: user._id
    });
    
    if (!key) {
      return NextResponse.json(
        { success: false, message: 'API key not found' },
        { status: 404 }
      );
    }
    
    // Update API key
    await keysCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, updatedAt: new Date() } }
    );
    
    return NextResponse.json({
      success: true,
      message: 'API key updated successfully'
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

// Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Await the params object before destructuring
    const { id } = await params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid key ID' },
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
    
    // Delete API key that belongs to the user
    const result = await keysCollection.deleteOne({
      _id: new ObjectId(id),
      userId: user._id
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'API key not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete API key' },
      { status: 500 }
    );
  }
} 