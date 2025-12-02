import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === 'admin';

  // 公開ルート
  const publicRoutes = ['/auth/signin', '/auth/error', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // 承認アクション用のルート（トークンベース認証）
  const isApprovalRoute = pathname.startsWith('/api/approval/action');
  const isDownloadRoute = pathname.startsWith('/api/download');

  if (isPublicRoute || isApprovalRoute || isDownloadRoute) {
    return NextResponse.next();
  }

  // 未ログインの場合はサインインページへ
  if (!isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 管理画面は管理者のみ
  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
