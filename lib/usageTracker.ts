import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

interface UsageRecord {
  keyId: ObjectId;
  userId: ObjectId;
  timestamp: Date;
  endpoint: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  latency?: number;
  status: number;
  ip?: string;
}

/**
 * Record API usage to the database
 */
export async function recordApiUsage({
  keyId,
  userId,
  endpoint,
  model,
  tokensInput = 0,
  tokensOutput = 0,
  latency,
  status,
  ip
}: {
  keyId: string;
  userId: string;
  endpoint: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  latency?: number;
  status: number;
  ip?: string;
}): Promise<boolean> {
  try {
    const client = await clientPromise;
    const usageCollection = client.db().collection('apiUsage');
    
    const usageRecord: UsageRecord = {
      keyId: new ObjectId(keyId),
      userId: new ObjectId(userId),
      timestamp: new Date(),
      endpoint,
      model,
      tokensInput,
      tokensOutput,
      latency,
      status,
      ip
    };
    
    await usageCollection.insertOne(usageRecord);
    return true;
  } catch (error) {
    console.error('Error recording API usage:', error);
    return false;
  }
}

/**
 * Calculate token usage for OpenAI-compatible API calls
 * This is a simplified version and might need adaptation based on actual models
 */
export function calculateTokens(requestBody: any, responseBody: any): { input: number; output: number } {
  let inputTokens = 0;
  let outputTokens = 0;
  
  try {
    // For chat completions
    if (requestBody.messages && Array.isArray(requestBody.messages)) {
      // Very rough estimation: 1 token ~= 4 characters
      const inputText = JSON.stringify(requestBody.messages);
      inputTokens = Math.ceil(inputText.length / 4);
    }
    
    // If it's a completion request
    if (requestBody.prompt) {
      const promptText = typeof requestBody.prompt === 'string' 
        ? requestBody.prompt 
        : JSON.stringify(requestBody.prompt);
      inputTokens = Math.ceil(promptText.length / 4);
    }
    
    // If it's an embedding request
    if (requestBody.input) {
      const inputText = typeof requestBody.input === 'string'
        ? requestBody.input
        : JSON.stringify(requestBody.input);
      inputTokens = Math.ceil(inputText.length / 4);
    }
    
    // Calculate output tokens from response
    if (responseBody.choices && Array.isArray(responseBody.choices)) {
      const outputText = responseBody.choices.map((choice: any) => {
        if (choice.message) return JSON.stringify(choice.message);
        if (choice.text) return choice.text;
        return '';
      }).join('');
      
      outputTokens = Math.ceil(outputText.length / 4);
    }
    
    // For embedding responses
    if (responseBody.data && Array.isArray(responseBody.data)) {
      // Usually embedding models don't return tokens in the same way
      // We'll use a fixed value for embedding outputs
      outputTokens = 1; // Just to indicate it was used
    }
  } catch (error) {
    console.error('Error calculating tokens:', error);
  }
  
  return { input: inputTokens, output: outputTokens };
}

/**
 * Parse usage information from OpenAI-compatible API responses
 */
export function extractUsageFromResponse(responseBody: any): { input: number; output: number; total: number } | null {
  try {
    if (responseBody.usage) {
      return {
        input: responseBody.usage.prompt_tokens || 0,
        output: responseBody.usage.completion_tokens || 0,
        total: responseBody.usage.total_tokens || 0
      };
    }
  } catch (error) {
    console.error('Error extracting usage from response:', error);
  }
  
  return null;
} 