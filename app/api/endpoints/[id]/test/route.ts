import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Test API endpoint connection
export async function POST(
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
    
    // Connect to database
    const client = await clientPromise;
    const apisCollection = client.db().collection('endpoints');
    
    // Find API
    const api = await apisCollection.findOne({ _id: new ObjectId(id) });
    
    if (!api) {
      return NextResponse.json(
        { success: false, message: 'API not found' },
        { status: 404 }
      );
    }
    
    // Attempt to connect to the API's models endpoint
    try {
      // Create the URL for the chat completions endpoint
      const testUrl = `${api.baseUrl}/v1/chat/completions`;
      
      // Start time measurement
      const startTime = Date.now();
      
      // Make a request to the chat completions endpoint
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api.apiKey || 'sk-test'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: api.models.length > 0 ? api.models[0] : 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message to verify the API endpoint is working.'
            }
          ],
          max_tokens: 5,
          stream: false
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      // End time measurement
      const endTime = Date.now();
      const timeConsumed = endTime - startTime;
      
      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: 'API endpoint is working correctly!',
          timeConsumed: timeConsumed // Time in milliseconds
        });
      } else {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          message: `API test failed: ${response.status} ${response.statusText}. ${errorText}`,
          timeConsumed: timeConsumed // Time in milliseconds
        });
      }
    } catch (error: unknown) {
      return NextResponse.json({
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
        timeConsumed: 0 // No time consumed for connection errors
      });
    }
  } catch (error: unknown) {
    console.error('Error testing API:', error);
    return NextResponse.json(
      { success: false, message: `Failed to test API: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 