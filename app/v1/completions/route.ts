import { NextRequest } from 'next/server';
import { validateApiKey, forwardRequest, updateApiKeyUsage } from '@/lib/apiUtils';
import { recordApiUsage, calculateTokens, extractUsageFromResponse } from '@/lib/usageTracker';

// This route handles OpenAI-compatible completions API requests
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: { message: 'Authentication failed. Please provide a valid API key.' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract the API key
    const apiKey = authHeader.split(' ')[1];
    
    // Validate the API key and get the API configurations
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid || !validation.endpoints || !validation.key) {
      return new Response(
        JSON.stringify({ error: { message: 'Invalid API key or associated API configuration not found.' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // The path for completions
    const path = '/completions';
    
    // Clone the request to parse body
    const clonedRequest = request.clone();
    let requestBody;
    try {
      requestBody = await clonedRequest.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: { message: 'Invalid request body. JSON parsing failed.' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if the request includes a specific model
    const modelName = requestBody.model;
    
    if (!modelName) {
      return new Response(
        JSON.stringify({ error: { message: 'Model parameter is required.' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Find an API that supports the requested model
    const supportingApi = validation.endpoints.find(api => 
      api.models.includes(modelName)
    );
    
    if (!supportingApi) {
      // If no API supports this model, return an error
      return new Response(
        JSON.stringify({ error: { message: `The requested model '${modelName}' is not supported by any configured API.` } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Forward the request to the target API
    const response = await forwardRequest(request, supportingApi, path);
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
    console.error('Completions API error:', error);
    return new Response(
      JSON.stringify({ error: { message: 'An internal server error occurred.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 