'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, { title: string; message: string }> = {
    NotRegistered: {
      title: 'アカウントが登録されていません',
      message: 'このシステムを利用するには、管理者によるアカウント登録が必要です。管理者にお問い合わせください。',
    },
    Inactive: {
      title: 'アカウントが無効化されています',
      message: 'あなたのアカウントは現在無効化されています。管理者にお問い合わせください。',
    },
    Default: {
      title: 'ログインエラー',
      message: '認証中にエラーが発生しました。もう一度お試しください。',
    },
  };

  const errorInfo = errorMessages[error || ''] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{errorInfo.title}</h1>
        <p className="text-gray-600">{errorInfo.message}</p>

        <Link
          href="/auth/signin"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ログインページへ戻る
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
