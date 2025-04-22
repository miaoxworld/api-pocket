import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// 使用带有额外配置的authOptions
// @ts-ignore - 忽略类型错误，因为我们添加了自定义配置
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 