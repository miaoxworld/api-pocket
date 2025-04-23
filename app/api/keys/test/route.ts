import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { validateApiKey } from '@/lib/apiUtils';

// Test API key functionality
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
    
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('API key not provided');
      return NextResponse.json(
        { success: false, message: 'API key not provided' },
        { status: 400 }
      );
    }
    
    // Extract the API key
    const apiKey = authHeader.split(' ')[1];
    
    // Validate the API key and get API configurations
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid || !validation.endpoints || !validation.key) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Extract one API configuration to test (prefer the first one)
    const targetApi = validation.endpoints[0];
    
    if (!targetApi) {
      console.error('No API configurations available');
      return NextResponse.json(
        { success: false, message: 'No API configurations available' },
        { status: 400 }
      );
    }
    
    // Test with a simple models request
    try {
      // Create test URL for chat completions endpoint
      const testUrl = '/v1/chat/completions';
      
      // Determine which model to use for testing
      const testModel = targetApi.models.length > 0 ? targetApi.models[0] : 'gpt-3.5-turbo';
      
      // Start time measurement
      const startTime = Date.now();
      
      // Create a test request to our local proxy endpoint
      const testResponse = await fetch(new URL(testUrl, request.url), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: testModel,
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message to verify the API key is working.'
            }
          ],
          max_tokens: 5,
          stream: true
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      // End time measurement
      const endTime = Date.now();
      const timeConsumed = endTime - startTime;
      
      if (testResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'API key is working correctly with your services!',
          timeConsumed: timeConsumed // Time in milliseconds
        });
      } else {
        const errorData = await testResponse.text();
        return NextResponse.json({
          success: false,
          message: `API key test failed: ${testResponse.status} ${testResponse.statusText}. ${errorData}`,
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
    console.error('Error testing API key:', error);
    return NextResponse.json(
      { success: false, message: `Failed to test API key: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 