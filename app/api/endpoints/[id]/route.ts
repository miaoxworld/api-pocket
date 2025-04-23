import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Get a single Endpoint
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
    
    const { id } = await params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid Endpoint ID' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const endpointsCollection = db.collection('endpoints');
    const usersCollection = db.collection('users');
    
    // Get user ID from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find Endpoint that belongs to this user
    const endpoint = await endpointsCollection.findOne({ 
      _id: new ObjectId(id),
      userId: user._id
    });
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Endpoint not found' },
        { status: 404 }
      );
    }
    
    // Return Endpoint
    return NextResponse.json({
      success: true,
      api: {
        id: endpoint._id.toString(),
        name: endpoint.name,
        baseUrl: endpoint.baseUrl,
        apiKey: endpoint.apiKey,
        isActive: endpoint.isActive,
        models: endpoint.models || [],
        userId: endpoint.userId.toString(),
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching Endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch Endpoint' },
      { status: 500 }
    );
  }
}

// Update an Endpoint
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
    
    const { id } = await params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid Endpoint ID' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { name, baseUrl, models, apiKey } = body;
    
    // Validate required fields
    if (!name || !baseUrl || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Name, Base URL and API Key are required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    try {
      new URL(baseUrl);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid Base URL format' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const endpointsCollection = db.collection('endpoints');
    const usersCollection = db.collection('users');
    
    // Get user ID from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if Endpoint exists and belongs to this user
    const endpoint = await endpointsCollection.findOne({ 
      _id: new ObjectId(id),
      userId: user._id
    });
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Endpoint not found' },
        { status: 404 }
      );
    }
    
    // Prepare updated data
    const baseUrlFormatted = baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    const modelsList = Array.isArray(models) ? models : [];
    
    // Update the Endpoint
    await endpointsCollection.updateOne(
      { _id: new ObjectId(id), userId: user._id },
      { 
        $set: { 
          name, 
          baseUrl: baseUrlFormatted, 
          apiKey: apiKey,
          models: modelsList,
          updatedAt: new Date() 
        } 
      }
    );
    
    // Update user's model names with the new models
    if (modelsList.length > 0) {
      const existingModels = user.modelNames || [];
      const uniqueModels = [...new Set([...existingModels, ...modelsList])];
      
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { modelNames: uniqueModels } }
      );
    }
    
    const updated = await endpointsCollection.findOne({ _id: new ObjectId(id), userId: user._id });
    
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve updated Endpoint' },
        { status: 500 }
      );
    }
    
    // Return updated Endpoint
    return NextResponse.json({
      success: true,
      api: {
        id: updated._id.toString(),
        name: updated.name,
        baseUrl: updated.baseUrl,
        apiKey: updated.apiKey,
        isActive: updated.isActive,
        models: updated.models || [],
        userId: updated.userId.toString(),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating Endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update Endpoint' },
      { status: 500 }
    );
  }
}

// Delete an Endpoint
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
    
    const { id } = await params;
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid Endpoint ID' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const endpointsCollection = db.collection('endpoints');
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
    
    // Check if Endpoint exists and belongs to this user
    const endpoint = await endpointsCollection.findOne({ 
      _id: new ObjectId(id),
      userId: user._id
    });
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Endpoint not found' },
        { status: 404 }
      );
    }
    
    // Delete associated API keys
    await keysCollection.deleteMany({ associatedApiId: new ObjectId(id) });
    
    // Delete Endpoint
    await endpointsCollection.deleteOne({ _id: new ObjectId(id), userId: user._id });
    
    return NextResponse.json({
      success: true,
      message: 'Endpoint and associated API keys deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete Endpoint' },
      { status: 500 }
    );
  }
} 