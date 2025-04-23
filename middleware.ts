import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // 不对静态文件和API路由应用国际化
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 