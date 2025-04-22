'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible?: boolean;
  onClose: () => void;
  timeConsumed?: number; // Time in milliseconds
}

export default function Toast({ message, type, isVisible = true, onClose, timeConsumed }: ToastProps) {
  const [isShowing, setIsShowing] = useState(false);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      const timer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(onClose, 300); // Wait for fade-out animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  // Format time in seconds with 2 decimal places if available
  const formattedTime = timeConsumed ? `${(timeConsumed / 1000).toFixed(2)}s` : '';

  // Define background color based on type
  const bgColor = {
    success: 'bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-800 text-green-700 dark:text-green-100',
    error: 'bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-800 text-red-700 dark:text-red-100',
    info: 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-100'
  }[type];

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 transition-opacity duration-300 ease-in-out"
         style={{ opacity: isShowing ? 1 : 0 }}>
      <div className={`max-w-md w-full shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 ${bgColor} border p-4`}>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">
              {message}
            </p>
            {timeConsumed !== undefined && (
              <span className="ml-3 text-xs font-semibold">
                {formattedTime}
              </span>
            )}
          </div>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            onClick={() => {
              setIsShowing(false);
              setTimeout(onClose, 300);
            }}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 