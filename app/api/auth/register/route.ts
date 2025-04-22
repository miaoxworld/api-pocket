import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import * as crypto from 'crypto';

// Helper function to generate a random API key
function generateRandomKey(length = 32) {
  // Generate a secure random string using crypto
  const bytes = crypto.randomBytes(length);
  
  // Convert to a base64 string and remove non-alphanumeric characters
  return bytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .slice(0, length);
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { name, email, password } = body;
    
    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = {
      _id: new ObjectId(),
      name,
      email,
      password: hashedPassword,
      role: 'user', // Default role is user
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await usersCollection.insertOne(user);
    
    // Generate and store API key for the new user
    const keysCollection = db.collection('apiKeys');
    const now = new Date();
    
    // Generate a unique API key
    let apiKey;
    let isUnique = false;
    
    while (!isUnique) {
      apiKey = generateRandomKey();
      const existingKey = await keysCollection.findOne({ key: apiKey });
      if (!existingKey) {
        isUnique = true;
      }
    }
    
    // Create and store the API key
    const newKey = {
      _id: new ObjectId(),
      name: `Default Key`,
      key: apiKey,
      userId: user._id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      usage: {
        requests: 0,
        tokens: 0,
        lastUsed: null
      }
    };
    
    await keysCollection.insertOne(newKey);
    
    // Return success response (without password)
    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
} 