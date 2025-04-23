import { ObjectId } from 'mongodb';

// User model
export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

// Endpoint Configuration model
export interface EndpointConfig {
  _id: ObjectId;
  name: string;
  baseUrl: string;
  apiKey: string;
  isActive: boolean;
  models: string[];
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// API Key model
export interface ApiKey {
  _id: ObjectId;
  name: string;
  key: string;
  userId: ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usage: {
    requests: number;
    tokens: number;
    lastUsed: Date | null;
  };
}

// Request Log model
export interface RequestLog {
  _id: ObjectId;
  apiId: ObjectId;
  keyId: ObjectId;
  userId: ObjectId;
  path: string;
  method: string;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  tokens: number;
  duration: number;
  timestamp: Date;
} 