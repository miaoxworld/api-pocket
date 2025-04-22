import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, forwardRequest, updateApiKeyUsage } from '@/lib/apiUtils';
import { recordApiUsage, calculateTokens, extractUsageFromResponse } from '@/lib/usageTracker';

// This route handles all OpenAI-compatible API requests
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Authentication failed. Please provide a valid API key.' } },
        { status: 401 }
      );
    }
    
    // Extract the API key
    const apiKey = authHeader.split(' ')[1];
    
    // Validate the API key and get the API configurations
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid || !validation.endpoints || !validation.key) {
      return NextResponse.json(
        { error: { message: 'Invalid API key or associated API configuration not found.' } },
        { status: 401 }
      );
    }
    
    // Get the path from the URL (remove /v1 prefix)
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/v1/, '');
    
    // Clone the request to parse body
    const clonedRequest = request.clone();
    let requestBody;
    try {
      requestBody = await clonedRequest.json();
    } catch (error) {
      requestBody = {};
    }
    
    // Check if the request includes a specific model
    const modelName = requestBody.model;
    
    // Find an API that supports the requested model, or use the first active API if no model specified
    let targetApi = validation.endpoints[0]; // Default to first API
    
    if (modelName) {
      // Find API that supports the requested model
      const supportingApi = validation.endpoints.find(api => 
        api.models.includes(modelName)
      );
      
      if (supportingApi) {
        targetApi = supportingApi;
      } else {
        // If no API specifically supports this model, return an error
        return NextResponse.json(
          { error: { message: `The requested model '${modelName}' is not supported by any configured API.` } },
          { status: 400 }
        );
      }
    }
    
    // Forward the request to the target API
    const response = await forwardRequest(request, targetApi, path);
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // Parse response body for token usage
    let responseBody = {};
    let tokensInput = 0;
    let tokensOutput = 0;
    
    try {
      const responseClone = response.clone();
      responseBody = await responseClone.json();
      
      // Extract token usage from response if available
      const usage = extractUsageFromResponse(responseBody);
      if (usage) {
        tokensInput = usage.input;
        tokensOutput = usage.output;
      } else {
        // If not available, calculate approximate token usage
        const tokens = calculateTokens(requestBody, responseBody);
        tokensInput = tokens.input;
        tokensOutput = tokens.output;
      }
    } catch (error) {
      console.error('Error parsing response body:', error);
    }
    
    // Get IP address from request
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Record API usage asynchronously
    recordApiUsage({
      keyId: validation.key.id,
      userId: validation.key.userId,
      endpoint: path,
      model: modelName,
      tokensInput,
      tokensOutput,
      latency,
      status: response.status,
      ip: typeof ip === 'string' ? ip : ip[0]
    }).catch(err => {
      console.error('Failed to record API usage:', err);
    });
    
    // Update API key usage statistics
    updateApiKeyUsage(validation.key.id, { 
      requests: 1,
      tokens: tokensInput + tokensOutput
    }).catch(err => {
      console.error('Failed to update API key usage:', err);
    });
    
    return response;
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

// Support for other HTTP methods
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

// Generic handler for all methods
async function handleRequest(request: NextRequest) {
  // For OpenAI compatibility, most endpoints use POST, but we'll support other methods too
  if (request.method === 'GET') {
    // Models endpoint is commonly called with GET
    if (request.url.includes('/models')) {
      return POST(request);
    }
  }
  
  return POST(request);
} 