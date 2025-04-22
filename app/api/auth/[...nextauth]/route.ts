import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import GoogleProvider from 'next-auth/providers/google';
import * as crypto from 'crypto';
import { ObjectId } from 'mongodb';

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

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    role?: string;
  }
  
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

const handler = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          const client = await clientPromise;
          const usersCollection = client.db().collection('users');
          
          const user = await usersCollection.findOne({
            email: credentials.email
          });
          
          if (!user) {
            return null;
          }
          
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          
          if (!isPasswordValid) {
            return null;
          }
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const client = await clientPromise;
          const db = client.db();
          const usersCollection = db.collection('users');
          
          // Check if user exists
          const existingUser = await usersCollection.findOne({ email: user.email });
          
          if (existingUser) {
            // Update user data if needed
            user.role = existingUser.role || 'user';
          } else {
            // Create new user with default role
            const userId = new ObjectId();
            const now = new Date();
            
            const newUser = {
              _id: userId,
              email: user.email,
              name: user.name,
              image: user.image,
              role: 'user',
              createdAt: now
            };
            
            await usersCollection.insertOne(newUser);
            user.role = 'user';
            
            // Generate and store API key for the new user
            const keysCollection = db.collection('apiKeys');
            
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
              userId: userId,
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
          }
        } catch (error) {
          console.error('Google auth processing error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST }; 