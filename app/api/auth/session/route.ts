import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    // Get the standard NextAuth session
    const session = await getServerSession();
    
    // If there's no session, return null (user is not logged in)
    if (!session || !session.user) {
      return NextResponse.json(null);
    }
    
    // Check if the user exists in the database
    const client = await clientPromise;
    const usersCollection = client.db().collection('users');
    
    // Try to find the user by email
    const user = await usersCollection.findOne({ email: session.user.email });
    
    // If user doesn't exist in the database, return unauthorized status
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 401 }
      );
    }
    
    // User exists in the database, return the session
    return NextResponse.json(session);
  } catch (error) {
    console.error('Error in /api/auth/session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 