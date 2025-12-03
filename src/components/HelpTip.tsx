'use client';

import { useState, useRef, useEffect } from 'react';

interface HelpTipProps {
  content: string;
  className?: string;
  /** 強調表示（パルスアニメーション） */
  highlight?: boolean;
  /** タイトル（太字で表示） */
  title?: string;
  /** ツールチップの位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** アイコンサイズ */
  size?: 'sm' | 'md' | 'lg';
}

export default function HelpTip({
  content,
  className = '',
  highlight = false,
  title,
  position = 'bottom',
  size = 'md'
}: HelpTipProps) {
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

  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6'
  };

  // 位置に応じたツールチップのスタイル
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return {
          tooltip: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
          arrow: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent border-t-8 border-l-8 border-r-8 border-b-0'
        };
      case 'left':
        return {
          tooltip: 'right-full mr-2 top-1/2 -translate-y-1/2',
          arrow: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent border-l-8 border-t-8 border-b-8 border-r-0'
        };
      case 'right':
        return {
          tooltip: 'left-full ml-2 top-1/2 -translate-y-1/2',
          arrow: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent border-r-8 border-t-8 border-b-8 border-l-0'
        };
      case 'bottom':
      default:
        return {
          tooltip: 'top-full mt-2 left-1/2 -translate-x-1/2',
          arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent border-b-8 border-l-8 border-r-8 border-t-0'
        };
    }
  };

  const positionStyles = getPositionStyles();

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center ${sizeClasses[size]} rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 ${
          highlight
            ? 'text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 animate-pulse'
            : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
        } ${isOpen ? 'text-blue-600 bg-blue-100' : ''}`}
        aria-label="ヘルプ"
        title="クリックしてヘルプを表示"
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
          className={`absolute z-50 w-64 sm:w-72 p-3 bg-gray-900 text-white text-xs sm:text-sm rounded-lg shadow-xl transform ${positionStyles.tooltip}`}
          style={{
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateX(-50%) translateY(4px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          <div className={`absolute w-0 h-0 ${positionStyles.arrow}`} />
          {title && (
            <p className="font-bold text-blue-300 mb-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {title}
            </p>
          )}
          <p className="leading-relaxed">{content}</p>
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-1.5 right-1.5 p-1 text-gray-400 hover:text-white rounded transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </span>
  );
}
