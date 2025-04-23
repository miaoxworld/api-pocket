import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, forwardRequest, updateApiKeyUsage } from '@/lib/apiUtils';

// Handle OpenAI-compatible chat completions
export async function POST(request: NextRequest) {
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
    console.log('validation',validation);
    // Clone request for parsing
    const requestClone = request.clone();
    const requestBody = await requestClone.json();
    
    // Find an API that supports the requested model, or use the first active API if no model specified
    //randome target api
    const randomIndex = Math.floor(Math.random() * validation.endpoints.length);
    let targetApi = validation.endpoints[randomIndex];
    
    if (requestBody.model) {
      // Find API that supports the requested model
      const supportingApi = validation.endpoints.find(api => 
        api.models.includes(requestBody.model) && api.isActive
      );
      
      if (supportingApi) {
        targetApi = supportingApi;
      } else {
        // If no API specifically supports this model, return an error with available models
        const availableModels = validation.endpoints.flatMap(api => api.models);
        return NextResponse.json(
          { 
            error: { 
              message: `Model '${requestBody.model}' is not supported. Supported models: ${availableModels.join(', ')}` 
            } 
          },
          { status: 400 }
        );
      }
    }
    
    // Check if API is active
    if (!targetApi.isActive) {
      return NextResponse.json(
        { error: { message: 'The API endpoint is currently inactive.' } },
        { status: 403 }
      );
    }
    
    // Get input tokens count for usage tracking (simple estimation)
    let inputTokens = 0;
    if (requestBody.messages && Array.isArray(requestBody.messages)) {
      // Very rough estimation: ~4 chars per token
      inputTokens = Math.ceil(
        JSON.stringify(requestBody.messages).length / 4
      );
    }
    
    // Get the start time for performance measurement
    const startTime = Date.now();
    
    // Forward the request to the target API
    // Path should be "/v1/chat/completions" for OpenAI compatibility
    const response = await forwardRequest(request, targetApi, '/v1/chat/completions');

    // Check if this is a streaming response
    const isStreamingResponse = requestBody.stream === true;
    
    if (isStreamingResponse) {
      // For streaming responses, we need to forward the response as-is
      // Update usage stats with just the input tokens for now
      updateApiKeyUsage(validation.key.id, { 
        requests: 1,
        tokens: inputTokens // Only count input tokens for streaming
      }).catch(err => {
        console.error('Failed to update API key usage:', err);
      });
      
      // Log the request (without output token count for streaming)
      logRequest({
        apiId: targetApi.id,
        keyId: validation.key.id,
        userId: validation.key.userId,
        path: '/v1/chat/completions',
        method: 'POST',
        statusCode: response.status,
        requestSize: JSON.stringify(requestBody).length,
        responseSize: 0, // Unknown for streaming
        tokens: inputTokens,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }).catch(err => {
        console.error('Failed to log request:', err);
      });
      
      // Return the streaming response
      return response;
    } else {
      // For non-streaming responses, process as before
      const duration = Date.now() - startTime;
      
      // Get the response data to estimate output tokens
      const responseData = await response.clone().json();
      
      // Estimate output tokens
      let outputTokens = 0;
      if (responseData.choices && Array.isArray(responseData.choices)) {
        // Try to use token count from usage if available
        if (responseData.usage && responseData.usage.completion_tokens) {
          outputTokens = responseData.usage.completion_tokens;
        } else {
          // Otherwise, make a rough estimation
          for (const choice of responseData.choices) {
            if (choice.message && choice.message.content) {
              // Very rough estimation: ~4 chars per token
              outputTokens += Math.ceil(choice.message.content.length / 4);
            }
          }
        }
      }
      
      // Total tokens
      const totalTokens = inputTokens + outputTokens;
      
      // Update API key usage statistics
      updateApiKeyUsage(validation.key.id, { 
        requests: 1,
        tokens: totalTokens
      }).catch(err => {
        console.error('Failed to update API key usage:', err);
      });
      
      // Log the request
      logRequest({
        apiId: targetApi.id,
        keyId: validation.key.id,
        userId: validation.key.userId,
        path: '/v1/chat/completions',
        method: 'POST',
        statusCode: response.status,
        requestSize: JSON.stringify(requestBody).length,
        responseSize: JSON.stringify(responseData).length,
        tokens: totalTokens,
        duration,
        timestamp: new Date()
      }).catch(err => {
        console.error('Failed to log request:', err);
      });
      
      // Return the response from the target API
      return response;
    }
  } catch (error) {
    console.error('Chat completions API error:', error);
    return NextResponse.json(
      { error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

// Helper function to log API requests
async function logRequest(logData: {
  apiId: string;
  keyId: string;
  userId: string;
  path: string;
  method: string;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  tokens: number;
  duration: number;
  timestamp: Date;
}) {
  try {
    const { MongoClient, ObjectId } = require('mongodb');
    const clientPromise = require('@/lib/mongodb').default;
    
    const client = await clientPromise;
    const logsCollection = client.db().collection('requestLogs');
    
    await logsCollection.insertOne({
      ...logData,
      apiId: new ObjectId(logData.apiId),
      keyId: new ObjectId(logData.keyId),
      userId: new ObjectId(logData.userId)
    });
  } catch (error) {
    console.error('Error logging request:', error);
  }
} 