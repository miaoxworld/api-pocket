import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, forwardRequest, updateApiKeyUsage } from '@/lib/apiUtils';

// Interface for the model object in the response
interface ModelObject {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

// Handles GET /v1/models endpoint
export async function GET(request: NextRequest) {
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

    // Collect all models from all active endpoints
    const allModels = validation.endpoints.reduce((models: ModelObject[], endpoint) => {
      endpoint.models.forEach(model => {
        if (!models.some(m => m.id === model)) {
          models.push({
            id: model,
            object: "model",
            created: Math.floor(Date.now() / 1000),
            owned_by: endpoint.name,
          });
        }
      });
      return models;
    }, []);

    // Form the OpenAI compatible response
    const response = {
      object: "list",
      data: allModels
    };

    // Update API key usage statistics
    updateApiKeyUsage(validation.key.id, { 
      requests: 1,
      tokens: 0 // No tokens for models endpoint
    }).catch(err => {
      console.error('Failed to update API key usage:', err);
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

// Also support POST method for compatibility
export async function POST(request: NextRequest) {
  return GET(request);
} 