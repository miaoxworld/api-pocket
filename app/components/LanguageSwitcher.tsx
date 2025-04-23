'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from '@/navigation';
import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n/request';

const languageNames: Record<string, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語'
};

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentLocale = useLocale();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    
    // Extract the path without the locale prefix
    const pathSegments = pathname.split('/');
    // Remove the locale segment if it exists
    if (locales.includes(pathSegments[1] as any)) {
      pathSegments.splice(1, 1);
    }
    // Reconstruct the path without the locale
    const pathWithoutLocale = pathSegments.join('/') || '/';
    
    startTransition(() => {
      router.replace(pathWithoutLocale, { locale: newLocale });
    });
  };

  return (
    <div className="relative">
      <select
        value={currentLocale}
        onChange={handleChange}
        className="appearance-none bg-transparent border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isPending}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {languageNames[locale] || locale}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
} 