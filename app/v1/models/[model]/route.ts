import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, updateApiKeyUsage } from '@/lib/apiUtils';

// Handles GET /v1/models/:model endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: { model: string } }
) {
  const startTime = Date.now();
  try {
    const modelId = params.model;
    
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

    // Find an endpoint that supports the requested model
    const supportingEndpoint = validation.endpoints.find(endpoint => 
      endpoint.models.includes(modelId)
    );

    if (!supportingEndpoint) {
      return NextResponse.json(
        { error: { message: `The model '${modelId}' does not exist` } },
        { status: 404 }
      );
    }

    // Form the OpenAI compatible response
    const modelObject = {
      id: modelId,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: supportingEndpoint.name,
    };

    // Update API key usage statistics
    updateApiKeyUsage(validation.key.id, { 
      requests: 1,
      tokens: 0 // No tokens for models endpoint
    }).catch(err => {
      console.error('Failed to update API key usage:', err);
    });

    return NextResponse.json(modelObject);
  } catch (error) {
    console.error('Model API error:', error);
    return NextResponse.json(
      { error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
} 