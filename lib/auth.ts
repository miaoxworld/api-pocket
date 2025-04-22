import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import GoogleProvider from 'next-auth/providers/google';
import * as crypto from 'crypto';
import { ObjectId } from 'mongodb';

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

// 创建包含额外配置的扩展AuthOptions
const extendedAuthOptions: AuthOptions & { 
  allowDangerousEmailAccountLinking?: boolean
} = {
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
    signIn: '/login',
    error: '/auth-error'
  },
  debug: process.env.NODE_ENV === 'development',
  cookies: {},
  events: {},
  theme: {
    colorScheme: 'auto',
  },
  // 允许账号链接
  allowDangerousEmailAccountLinking: true,
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (credentials) {
        return true; // 使用凭证登录，直接通过
      }
      
      if (account?.provider === 'google') {
        try {
          const client = await clientPromise;
          const db = client.db();
          const usersCollection = db.collection('users');

          // 相同邮箱可能已有账号
          const existingUser = await usersCollection.findOne({ email: user.email });
          
          if (existingUser) {
            // 用户已存在，重要：手动添加或更新账号链接记录
            // 这是绕过 NextAuth 限制的关键
            const accountsCollection = db.collection('accounts');
            
            // 检查是否已有链接记录
            const existingAccount = await accountsCollection.findOne({
              userId: existingUser._id,
              provider: 'google'
            });
            
            if (!existingAccount) {
              // 创建新的链接记录
              await accountsCollection.insertOne({
                userId: existingUser._id,
                type: 'oauth',
                provider: 'google',
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              console.log('账号链接成功:', user.email);
            }
            
            // 确保返回正确的用户ID
            user.id = existingUser._id.toString();
            user.role = existingUser.role || 'user';
          } else {
            // 创建新用户
            console.log('创建新用户:', user.email);
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
            
            // 为新用户生成API密钥
            const keysCollection = db.collection('apiKeys');
            
            // 生成唯一API密钥
            let apiKey;
            let isUnique = false;
            
            while (!isUnique) {
              apiKey = generateRandomKey();
              const existingKey = await keysCollection.findOne({ key: apiKey });
              if (!existingKey) {
                isUnique = true;
              }
            }
            
            // 创建并存储API密钥
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
          console.error('Google 登录处理错误:', error);
          return false;
        }
      }
      
      return true; // 允许登录继续
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
};

// 导出带有额外配置的authOptions
export const authOptions = extendedAuthOptions; 