import { NextRequest } from 'next/server';
import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';
export interface ApiConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  isActive: boolean;
  models: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usage: {
    requests: number;
    tokens: number;
    lastUsed: Date | null;
  };
}

/**
 * Validate an API key and return the API configurations
 */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; endpoints?: ApiConfig[]; key?: ApiKey }> {
  try {
    const client = await clientPromise;
    const keysCollection = client.db().collection('apiKeys');
    
    // Find the API key in the database
    const keyDoc = await keysCollection.findOne({ key: apiKey, isActive: true });
    console.log('keyDoc',keyDoc);
    if (!keyDoc) {
      return { valid: false };
    }
    
    // Retrieve all active API configurations for the user
    const apisCollection = client.db().collection('endpoints');
    const apiDocs = await apisCollection.find({ 
      isActive: true,
      userId: keyDoc.userId // Only get endpoints that belong to the same user as the key
    }).toArray();
    
    if (!apiDocs || apiDocs.length === 0) {
      return { valid: false };
    }
    console.log('apiDocs',apiDocs);
    // Format API objects
    const endpoints: ApiConfig[] = apiDocs.map(apiDoc => ({
      id: apiDoc._id.toString(),
      name: apiDoc.name,
      baseUrl: apiDoc.baseUrl,
      apiKey: apiDoc.apiKey,
      isActive: apiDoc.isActive,
      models: apiDoc.models || [],
      userId: apiDoc.userId.toString(),
      createdAt: apiDoc.createdAt,
      updatedAt: apiDoc.updatedAt
    }));
    
    // Format key object
    const key: ApiKey = {
      id: keyDoc._id.toString(),
      name: keyDoc.name,
      key: keyDoc.key,
      userId: keyDoc.userId.toString(),
      isActive: keyDoc.isActive,
      createdAt: keyDoc.createdAt,
      updatedAt: keyDoc.updatedAt,
      usage: keyDoc.usage || { requests: 0, tokens: 0, lastUsed: null }
    };
    
    return { valid: true, endpoints, key };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false };
  }
}

/**
 * Forward a request to the appropriate backend API
 */
export async function forwardRequest(
  request: NextRequest,
  api: ApiConfig,
  path: string
): Promise<Response> {
  try {
    // Build the target URL by combining the API base URL with the requested path
    const targetUrl = `${api.baseUrl}${path}`;
    
    // Clone the original request to modify it
    const requestClone = request.clone();
    const requestBody = await requestClone.text();
    
    // Set up the headers for the forwarded request
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Don't forward some headers like host
      if (!['host', 'connection', 'authorization'].includes(key.toLowerCase())) {
        headers.append(key, value);
      }
    });
    // use apikey by ApiConfig，not original request
    headers.append('authorization', `Bearer ${api.apiKey}`);

    // Make the request to the backend API
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : requestBody,
      redirect: 'follow',
    });
    
    // Return the response from the backend API
    return response;
  } catch (error) {
    console.error('Error forwarding request to API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to forward request to API server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Update API key usage statistics
 */
export async function updateApiKeyUsage(
  keyId: string,
  usage: { requests?: number; tokens?: number }
): Promise<boolean> {
  try {
    const client = await clientPromise;
    const keysCollection = client.db().collection('apiKeys');
    
    const updateData: any = {
      updatedAt: new Date(),
      'usage.lastUsed': new Date(),
    };
    
    // Create the update object
    const updateOps: any = { $set: updateData };
    
    // Add increment operations if provided
    if (usage.requests) {
      if (!updateOps.$inc) updateOps.$inc = {};
      updateOps.$inc['usage.requests'] = usage.requests;
    }
    
    if (usage.tokens) {
      if (!updateOps.$inc) updateOps.$inc = {};
      updateOps.$inc['usage.tokens'] = usage.tokens;
    }
    
    await keysCollection.updateOne(
      { _id: new ObjectId(keyId) },
      updateOps
    );
    
    return true;
  } catch (error) {
    console.error('Error updating API key usage:', error);
    return false;
  }
}