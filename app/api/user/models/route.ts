import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';

// Get all unique model names for the current user
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
    
    // Get user from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return user's model names
    return NextResponse.json({ 
      success: true, 
      models: user.modelNames || [] 
    });
  } catch (error) {
    console.error('Error fetching model names:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch model names' },
      { status: 500 }
    );
  }
}

// Add new model names to user's list
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
    const { models } = body;
    
    if (!Array.isArray(models)) {
      return NextResponse.json(
        { success: false, message: 'Models must be an array of strings' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Get user from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create a Set from existing model names and add new ones
    const existingModels = user.modelNames || [];
    const uniqueModels = [...new Set([...existingModels, ...models])];
    
    // Update user with new model names
    await usersCollection.updateOne(
      { email: session.user.email },
      { $set: { modelNames: uniqueModels } }
    );
    
    return NextResponse.json({ 
      success: true, 
      models: uniqueModels 
    });
  } catch (error) {
    console.error('Error updating model names:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update model names' },
      { status: 500 }
    );
  }
} 