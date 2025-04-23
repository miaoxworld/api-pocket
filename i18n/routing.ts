import { locales } from './request';

// 导出路由配置
export const routing = {
  locales,
  defaultLocale: 'en' as const,
  localePrefix: 'as-needed' as const
}; 