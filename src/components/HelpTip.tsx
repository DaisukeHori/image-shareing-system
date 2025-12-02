'use client';

import { useState, useRef, useEffect } from 'react';

interface HelpTipProps {
  content: string;
  className?: string;
}

export default function HelpTip({ content, className = '' }: HelpTipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tipRef.current &&
        buttonRef.current &&
        !tipRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-gray-600 focus:outline-none"
        aria-label="ヘルプ"
      >
        <svg
          className="w-full h-full"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          ref={tipRef}
          className="absolute z-50 left-0 sm:left-auto top-6 w-64 sm:w-72 p-3 bg-gray-900 text-white text-xs sm:text-sm rounded-lg shadow-lg"
          style={{ transform: 'translateX(-50%)', left: '50%' }}
        >
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
          {content}
        </div>
      )}
    </span>
  );
}
