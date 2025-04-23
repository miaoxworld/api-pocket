import { redirect } from 'next/navigation';

// 处理访问根路径的重定向
export default function RootPage() {
  redirect('/en');
} 