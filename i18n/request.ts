import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// 支持的语言
export const locales = ['en', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];

// 获取请求时的语言配置
export default getRequestConfig(async ({ requestLocale }) => {
  // 验证语言是否支持
  const locale = await requestLocale;
  if (!locale || !locales.includes(locale as any)) {
    return {
      locale: 'en',
      messages: (await import(`../messages/en/index.json`)).default
    };
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}/index.json`)).default
  };
}); 