import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Toggle API active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
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
        { success: false, message: 'Invalid API ID' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { isActive } = body;
    
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'isActive must be a boolean value' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const apisCollection = client.db().collection('endpoints');
    
    // Check if API exists
    const api = await apisCollection.findOne({ _id: new ObjectId(id) });
    if (!api) {
      return NextResponse.json(
        { success: false, message: 'API not found' },
        { status: 404 }
      );
    }
    
    // Update API status
    await apisCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive, updatedAt: new Date() } }
    );
    
    // Get updated API
    const updated = await apisCollection.findOne({ _id: new ObjectId(id) });
    
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve updated API' },
        { status: 500 }
      );
    }
    
    // Return updated API
    return NextResponse.json({
      success: true,
      api: {
        id: updated._id.toString(),
        name: updated.name,
        baseUrl: updated.baseUrl,
        isActive: updated.isActive,
        models: updated.models || [],
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('Error toggling API status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to toggle API status' },
      { status: 500 }
    );
  }
} 