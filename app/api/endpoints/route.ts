import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Get all Endpoints
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
    const endpointsCollection = db.collection('endpoints');
    const usersCollection = db.collection('users');
    
    // Get user ID from session
    const user = await usersCollection.findOne({ email: session.user.email });
    
    if (!user) {
      console.error('User not found', session.user.email);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all Endpoints for this user
    const endpoints = await endpointsCollection.find({ userId: user._id }).toArray();
    
    // Format the response
    const formattedEndpoints = endpoints.map(endpoint => ({
      id: endpoint._id.toString(),
      name: endpoint.name,
      baseUrl: endpoint.baseUrl,
      isActive: endpoint.isActive,
      models: endpoint.models || [],
      userId: endpoint.userId.toString(),
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt
    }));
    
    return NextResponse.json({ success: true, endpoints: formattedEndpoints });
  } catch (error) {
    console.error('Error fetching Endpoints:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch Endpoints' },
      { status: 500 }
    );
  }
}

// Create a new Endpoint
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
    const { name, baseUrl, models, apiKey } = body;
    
    // Validate required fields
    if (!name || !baseUrl || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Name, Base URL, and API Key are required' },
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
    
    // Create new Endpoint
    const now = new Date();
    const modelsList = Array.isArray(models) ? models : [];
    
    const newEndpoint = {
      _id: new ObjectId(),
      name,
      baseUrl: baseUrl.trim().replace(/\/$/, ''), // Remove trailing slash
      isActive: true,
      models: modelsList,
      userId: user._id,
      createdAt: now,
      updatedAt: now
    };
    
    await endpointsCollection.insertOne(newEndpoint);
    
    // Update user's model names with the new models
    if (modelsList.length > 0) {
      const existingModels = user.modelNames || [];
      const uniqueModels = [...new Set([...existingModels, ...modelsList])];
      
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { modelNames: uniqueModels } }
      );
    }
    
    // Return the created Endpoint
    return NextResponse.json({
      success: true,
      api: {
        id: newEndpoint._id.toString(),
        name: newEndpoint.name,
        baseUrl: newEndpoint.baseUrl,
        isActive: newEndpoint.isActive,
        models: newEndpoint.models,
        userId: newEndpoint.userId.toString(),
        createdAt: newEndpoint.createdAt,
        updatedAt: newEndpoint.updatedAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating Endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create Endpoint' },
      { status: 500 }
    );
  }
} 