import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Bulk delete API keys
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
    const { ids } = body;
    
    // Validate required fields
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one key ID is required' },
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
    
    // Validate ObjectIds and create array of ObjectId objects
    const validIds = [];
    const invalidIds = [];
    
    for (const id of ids) {
      if (ObjectId.isValid(id)) {
        validIds.push(new ObjectId(id));
      } else {
        invalidIds.push(id);
      }
    }
    
    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid key IDs provided' },
        { status: 400 }
      );
    }
    
    // Delete API keys that belong to the user
    const result = await keysCollection.deleteMany({
      _id: { $in: validIds },
      userId: user._id
    });
    
    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} API keys deleted successfully`,
      deletedCount: result.deletedCount,
      invalidIds: invalidIds.length > 0 ? invalidIds : undefined
    });
  } catch (error) {
    console.error('Error deleting API keys:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete API keys' },
      { status: 500 }
    );
  }
} 