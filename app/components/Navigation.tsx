'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { FiGithub } from 'react-icons/fi';
import { RiDiscordFill } from 'react-icons/ri';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'Endpoint Manager', href: '/endpoint-manager' },
    { name: 'API Keys', href: '/api-keys' },
    { name: '使用量统计', href: '/usage-dashboard' },
  ];

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <nav className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">API Pocket</span>
        </Link>
        <div className="flex items-center md:order-2">
          <div className="hidden md:flex items-center mr-6 space-x-5">
            <Link 
              href="https://github.com/miaoxworld/api-pocket-nextjs" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-500 transition-colors"
              title="GitHub"
            >
              <FiGithub size={20} />
            </Link>
            <Link 
              href="https://discord.gg/yAhBw4Kz" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-500 transition-colors"
              title="Discord"
            >
              <RiDiscordFill size={22} />
            </Link>
          </div>
          {status === 'authenticated' && session ? (
            <div className="relative">
              <button 
                type="button" 
                className="flex items-center text-sm font-medium text-gray-900 rounded-full hover:text-blue-600 dark:hover:text-blue-500 md:mr-0 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:text-white" 
                onClick={toggleUserMenu}
              >
                <span className="sr-only">Open user menu</span>
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                </div>
                <span className="ml-2">{session.user?.name || session.user?.email}</span>
                <svg className="w-2.5 h-2.5 ml-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
                </svg>
              </button>
              {showUserMenu && (
                <div className="z-50 absolute right-0 mt-2 w-48 bg-white divide-y divide-gray-100 rounded-lg shadow dark:bg-gray-700 dark:divide-gray-600">
                  <div className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    <div>{session.user?.name || 'User'}</div>
                    <div className="font-medium truncate">{session.user?.email}</div>
                  </div>
                  <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                    <li>
                      <Link href="/profile" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link href="/settings" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
                        Settings
                      </Link>
                    </li>
                  </ul>
                  <div className="py-2">
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex space-x-2">
              <Link href="/login" className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
                Sign In
              </Link>
              <Link href="/register" className="text-gray-800 bg-gray-100 hover:bg-gray-200 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white focus:outline-none dark:focus:ring-gray-700">
                Register
              </Link>
            </div>
          )}
        </div>
        <div className="hidden items-center justify-between w-full md:flex md:w-auto md:order-1" id="navbar-sticky">
          <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`block py-2 px-3 rounded ${
                    pathname === item.href
                      ? 'text-white bg-blue-700 md:text-blue-700 md:bg-transparent'
                      : 'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
            <li className="md:hidden flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Link 
                href="https://github.com/SillyTavern/SillyTavern" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-500 transition-colors"
                title="GitHub"
              >
                <FiGithub size={20} />
              </Link>
              <Link 
                href="https://discord.gg/yAhBw4Kz" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-500 transition-colors"
                title="Discord"
              >
                <RiDiscordFill size={22} />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
} 