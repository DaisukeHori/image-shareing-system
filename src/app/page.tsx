'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import HelpTip from '@/components/HelpTip';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  permission_level: 'view' | 'download' | 'edit';
}

interface Image {
  id: string;
  original_filename: string;
  storage_path: string;
  folder_id: string | null;
  folder: { id: string; name: string } | null;
  permission_level: 'view' | 'download' | 'edit';
  file_type?: 'image' | 'video';
  mime_type?: string;
  created_at: string;
  thumbnail_path?: string | null;
  preview_path?: string | null;
  processing_status?: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
}

type SortKey = 'filename' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface ApprovalRequest {
  id: string;
  request_number: string;
  image: Image | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'downloaded';
  purpose: string;
  created_at: string;
  expires_at: string | null;
  approver_comment: string | null;
  rejection_reason: string | null;
  approver: { id: string; name: string } | null;
  usage_end_date: string | null;
  deletion_confirmed_user: boolean;
  deletion_confirmed_approver: boolean;
}

const statusLabels: Record<string, { text: string; class: string }> = {
  pending: { text: '承認待ち', class: 'bg-yellow-100 text-yellow-800' },
  approved: { text: 'ダウンロード可', class: 'bg-green-100 text-green-800' },
  rejected: { text: '却下', class: 'bg-red-100 text-red-800' },
  expired: { text: '期限切れ', class: 'bg-gray-100 text-gray-800' },
  downloaded: { text: 'DL済み', class: 'bg-blue-100 text-blue-800' },
};

type PurposeType = 'hotpepper' | 'website' | 'sns' | 'print' | 'other';

const purposeTypeLabels: Record<PurposeType, string> = {
  hotpepper: '自店のホットペッパービューティー掲載ページ',
  website: '自店の公式ホームページおよびブログ',
  sns: '自店の公式SNSアカウント',
  print: '自店で使用するチラシ、DM、POPなどの販促物',
  other: 'その他',
};

export default function Home() {
  const { data: session } = useSession();
  const [images, setImages] = useState<Image[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [purpose, setPurpose] = useState('');
  const [purposeType, setPurposeType] = useState<PurposeType | ''>('');
  const [purposeOther, setPurposeOther] = useState('');
  const [usageEndDate, setUsageEndDate] = useState('');
  const [requesterComment, setRequesterComment] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 2段階申請フロー用の状態
  const [requestStep, setRequestStep] = useState<1 | 2>(1);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasWaitedEnough, setHasWaitedEnough] = useState(false);
  const [consentStartTime, setConsentStartTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(10);
  const [activeTab, setActiveTab] = useState<'images' | 'requests'>('images');
  const [showMenu, setShowMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<Image | null>(null);
  // 申請完了モーダル
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  // 申請キャンセル
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // ダウンロード確認モーダル
  const [downloadModal, setDownloadModal] = useState<ApprovalRequest | null>(null);
  const [downloading, setDownloading] = useState(false);
  // 申請詳細モーダル
  const [requestDetailModal, setRequestDetailModal] = useState<ApprovalRequest | null>(null);
  // 掲載終了確認
  const [confirmingDeletionId, setConfirmingDeletionId] = useState<string | null>(null);
  // エラーモーダル
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  // 並び替え
  const [sortKey, setSortKey] = useState<SortKey>('filename');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // ソート済み画像（useMemoで最適化）
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'filename') {
        comparison = a.original_filename.localeCompare(b.original_filename, 'ja');
      } else if (sortKey === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [images, sortKey, sortOrder]);

  // プレビュー用のナビゲーション関数（sortedImagesを使用）
  const currentPreviewIndex = previewImage ? sortedImages.findIndex(img => img.id === previewImage.id) : -1;
  const hasPrevImage = currentPreviewIndex > 0;
  const hasNextImage = currentPreviewIndex >= 0 && currentPreviewIndex < sortedImages.length - 1;

  function goToPrevImage() {
    if (hasPrevImage) {
      setPreviewImage(sortedImages[currentPreviewIndex - 1]);
    }
  }

  function goToNextImage() {
    if (hasNextImage) {
      setPreviewImage(sortedImages[currentPreviewIndex + 1]);
    }
  }

  // スワイプ用の状態
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  function handleTouchStart(e: React.TouchEvent) {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNextImage) {
      goToNextImage();
    } else if (isRightSwipe && hasPrevImage) {
      goToPrevImage();
    }

    setTouchStart(null);
    setTouchEnd(null);
  }

  // キーボードナビゲーション
  useEffect(() => {
    if (!previewImage) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextImage();
      } else if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, currentPreviewIndex]);

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  // URLパラメータでタブを切り替え
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'requests') {
      setActiveTab('requests');
    }
  }, []);

  // 同意書表示時の10秒タイマー
  useEffect(() => {
    if (requestStep === 2 && consentStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - consentStartTime) / 1000);
        const remaining = Math.max(0, 10 - elapsed);
        setRemainingSeconds(remaining);
        if (remaining === 0) {
          setHasWaitedEnough(true);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [requestStep, consentStartTime]);

  function buildBreadcrumbs(folderId: string | null, allFoldersList: Folder[]): Folder[] {
    if (!folderId) return [];
    const crumbs: Folder[] = [];
    let current = allFoldersList.find(f => f.id === folderId);
    while (current) {
      crumbs.unshift(current);
      current = current.parent_id ? allFoldersList.find(f => f.id === current!.parent_id) : undefined;
    }
    return crumbs;
  }

  async function fetchData() {
    try {
      const folderParam = currentFolderId ? `?parent_id=${currentFolderId}` : '?parent_id=null';
      const imageParam = currentFolderId ? `?folder_id=${currentFolderId}` : '?folder_id=null';

      const [foldersRes, imagesRes, requestsRes] = await Promise.all([
        fetch(`/api/folders${folderParam}`),
        fetch(`/api/images${imageParam}`),
        fetch('/api/requests'),
      ]);

      const foldersData = await foldersRes.json();
      const imagesData = await imagesRes.json();
      const requestsData = await requestsRes.json();

      if (foldersData.success) {
        setFolders(foldersData.data);
        setAllFolders(foldersData.flat || []);
        setBreadcrumbs(buildBreadcrumbs(currentFolderId, foldersData.flat || []));
      }
      if (imagesData.success) setImages(imagesData.data);
      if (requestsData.success) setMyRequests(requestsData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedImage || !purposeType || !usageEndDate || !agreedToTerms) return;
    if (purposeType === 'other' && !purposeOther.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: selectedImage.id,
          purpose_type: purposeType,
          purpose_other: purposeType === 'other' ? purposeOther.trim() : null,
          usage_end_date: usageEndDate,
          requester_comment: requesterComment.trim() || null,
          agreed_to_terms: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedImage(null);
        setPurpose('');
        setPurposeType('');
        setPurposeOther('');
        setUsageEndDate('');
        setRequesterComment('');
        setAgreedToTerms(false);
        setRequestStep(1);
        setHasScrolledToBottom(false);
        setHasWaitedEnough(false);
        setConsentStartTime(null);
        setRemainingSeconds(10);
        fetchData();
        setShowCompletionModal(true);
      } else {
        alert(data.error || '申請に失敗しました');
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('申請に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  function resetRequestForm() {
    setSelectedImage(null);
    setPurpose('');
    setPurposeType('');
    setPurposeOther('');
    setUsageEndDate('');
    setRequesterComment('');
    setAgreedToTerms(false);
    setRequestStep(1);
    setHasScrolledToBottom(false);
    setHasWaitedEnough(false);
    setConsentStartTime(null);
    setRemainingSeconds(10);
  }

  // Step2へ進む
  function goToConsentStep() {
    setRequestStep(2);
    setConsentStartTime(Date.now());
    setHasScrolledToBottom(false);
    setHasWaitedEnough(false);
    setRemainingSeconds(10);
  }

  // Step1に戻る
  function goBackToStep1() {
    setRequestStep(1);
    setAgreedToTerms(false);
    setHasScrolledToBottom(false);
    setHasWaitedEnough(false);
    setConsentStartTime(null);
    setRemainingSeconds(10);
  }

  // 同意書のスクロール検知
  function handleConsentScroll(e: React.UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }

  // 申請キャンセル処理
  async function handleCancelRequest() {
    if (!cancellingRequestId) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/requests/${cancellingRequestId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setCancellingRequestId(null);
      } else {
        alert(data.error || 'キャンセルに失敗しました');
      }
    } catch (error) {
      console.error('Failed to cancel request:', error);
      alert('キャンセルに失敗しました');
    } finally {
      setCancelling(false);
    }
  }

  // 掲載終了確認処理
  async function handleConfirmDeletion(requestId: string) {
    setConfirmingDeletionId(requestId);

    try {
      const res = await fetch('/api/requests/confirm-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setErrorModal({
          title: '確認できません',
          message: data.error || '確認に失敗しました',
        });
      }
    } catch (error) {
      console.error('Failed to confirm deletion:', error);
      setErrorModal({
        title: 'エラー',
        message: '確認に失敗しました',
      });
    } finally {
      setConfirmingDeletionId(null);
    }
  }

  // 掲載期限切れかどうかをチェック（掲載終了日の翌日0時以降が期限切れ）
  function isExpiredUsage(usageEndDate: string | null) {
    if (!usageEndDate) return false;
    const endDate = new Date(usageEndDate);
    endDate.setDate(endDate.getDate() + 1); // 翌日の0時
    return new Date() >= endDate;
  }

  // 最大利用期限日（1年後）を計算
  function getMaxEndDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }

  // 最小利用期限日（明日）を計算
  function getMinEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  async function handleDownload(requestId: string) {
    setDownloading(true);
    try {
      const res = await fetch(`/api/download/${requestId}`);

      if (!res.ok) {
        // エラーの場合はJSONとしてパース
        const data = await res.json();
        alert(data.error || 'ダウンロードに失敗しました');
        return;
      }

      // Content-Dispositionヘッダーからファイル名を取得
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = decodeURIComponent(match[1]);
        }
      }

      // ファイルをダウンロード
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // データを更新してモーダルを閉じる
      fetchData();
      setDownloadModal(null);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('ダウンロードに失敗しました');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDirectDownload(imageId: string) {
    try {
      const res = await fetch(`/api/images/${imageId}/download`);
      const data = await res.json();

      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert(data.error || 'ダウンロードに失敗しました');
      }
    } catch (error) {
      console.error('Failed to download:', error);
      alert('ダウンロードに失敗しました');
    }
  }

  function getImageUrl(storagePath: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${storagePath}`;
  }

  function isVideo(image: Image) {
    return image.file_type === 'video' || image.mime_type?.startsWith('video/');
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* スケルトンヘッダー */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* スケルトンタブ */}
          <div className="bg-white rounded-xl shadow-sm p-1 mb-4 sm:mb-6 animate-pulse">
            <div className="flex gap-2">
              <div className="flex-1 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1 h-12 bg-gray-100 rounded-lg" />
            </div>
          </div>
          {/* スケルトングリッド */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
                <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ヘッダー - モダンデザイン */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">R</span>
              </div>
              <h1 className="text-sm sm:text-lg font-bold text-white truncate">
                <span className="hidden sm:inline">画像管理システム</span>
                <span className="sm:hidden">画像管理</span>
              </h1>
            </div>
            {/* デスクトップメニュー */}
            <div className="hidden sm:flex items-center gap-4">
              <Link
                href="/guide"
                className="px-3 py-1.5 text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>📖</span>
                使い方
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
                <span className="text-sm text-white/90">{session?.user?.name}</span>
              </div>
              {session?.user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                >
                  管理画面
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="px-3 py-1.5 text-sm text-white/70 hover:text-white transition-colors"
              >
                ログアウト
              </button>
            </div>
            {/* モバイルメニュー */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 bg-white shadow-2xl rounded-2xl py-2 w-56 z-50 border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {session?.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                      <p className="text-xs text-gray-500">ログイン中</p>
                    </div>
                  </div>
                  <Link
                    href="/guide"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowMenu(false)}
                  >
                    <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">📖</span>
                    使い方ガイド
                  </Link>
                  {session?.user?.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50"
                      onClick={() => setShowMenu(false)}
                    >
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">⚙️</span>
                      管理画面
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">🚪</span>
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* ダウンロード可能な申請がある場合のアラートバナー - グラスモーフィズム */}
        {myRequests.filter((r) => r.status === 'approved').length > 0 && (
          <div
            onClick={() => setActiveTab('requests')}
            className="group mb-4 relative overflow-hidden rounded-2xl shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                      <span className="text-2xl sm:text-3xl">📥</span>
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-bounce">
                      {myRequests.filter((r) => r.status === 'approved').length}
                    </span>
                  </div>
                  <div className="text-white">
                    <p className="font-bold text-base sm:text-lg tracking-tight">
                      ダウンロード準備完了！
                    </p>
                    <p className="text-xs sm:text-sm text-white/80 flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      タップして今すぐダウンロード
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30 group-hover:bg-white/30 transition-colors">
                  <span className="text-white font-medium text-sm">確認する</span>
                  <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* タブ - プレミアムデザイン */}
        <div className="bg-white rounded-2xl shadow-sm p-1.5 mb-4 sm:mb-6 border border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-200 ${
                activeTab === 'images'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`text-lg ${activeTab === 'images' ? '' : 'grayscale opacity-70'}`}>🖼️</span>
              <span>画像を選ぶ</span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-200 relative ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`text-lg ${activeTab === 'requests' ? '' : 'grayscale opacity-70'}`}>📋</span>
              <span>申請履歴</span>
              {myRequests.filter((r) => r.status === 'approved').length > 0 && activeTab !== 'requests' && (
                <span className="absolute -top-2 -right-1 sm:right-4 min-w-5 h-5 px-1.5 text-xs bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  {myRequests.filter((r) => r.status === 'approved').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 使い方ガイド - 展開可能 */}
        <details className="mb-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
          <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors list-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-xl">📖</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">使い方ガイド</h3>
                <p className="text-xs text-gray-500">初めての方はこちらをご覧ください</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { step: 1, icon: '🔍', title: '画像を探す', desc: 'フォルダから画像を選択' },
                { step: 2, icon: '📝', title: '申請する', desc: '利用目的を入力して申請' },
                { step: 3, icon: '⏳', title: '承認を待つ', desc: '管理者が確認します' },
                { step: 4, icon: '📥', title: 'ダウンロード', desc: '承認後にDL可能' },
              ].map((item) => (
                <div key={item.step} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 text-center border border-gray-100">
                  <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2">
                    {item.step}
                  </div>
                  <span className="text-xl block mb-1">{item.icon}</span>
                  <p className="font-medium text-gray-900 text-xs">{item.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">注意事項</p>
                  <ul className="space-y-0.5 text-amber-700">
                    <li>• ダウンロードした画像は申請した目的以外に使用しないでください</li>
                    <li>• 掲載期限を過ぎたら速やかに削除してください</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </details>

        {activeTab === 'images' ? (
          <>
            {/* パンくずリスト */}
            <div className="flex items-center gap-1 mb-4 text-sm overflow-x-auto pb-2 bg-gray-100 rounded-lg px-3 py-2">
              <HelpTip
                title="フォルダ移動"
                content="クリックすると、そのフォルダに移動できます。「ルート」をクリックすると最上位に戻ります。"
                size="sm"
                className="mr-1"
              />
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md whitespace-nowrap ${
                  !currentFolderId
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
                }`}
              >
                🏠 ルート
              </button>
              {breadcrumbs.map((folder, index) => (
                <span key={folder.id} className="flex items-center gap-1">
                  <span className="text-gray-400 mx-1">›</span>
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                      index === breadcrumbs.length - 1
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
                    }`}
                  >
                    📁 {folder.name}
                  </button>
                </span>
              ))}
            </div>

            {/* 並び替えUI */}
            <div className="flex items-center justify-end gap-2 mb-3">
              <HelpTip
                title="並び替え"
                content="画像の表示順を変更できます。ファイル名順または作成日順で並び替えられます。"
                size="sm"
              />
              <span className="text-xs text-gray-600">並び替え:</span>
              <select
                value={`${sortKey}-${sortOrder}`}
                onChange={(e) => {
                  const [key, order] = e.target.value.split('-') as [SortKey, SortOrder];
                  setSortKey(key);
                  setSortOrder(order);
                }}
                className="px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="filename-asc">ファイル名（A→Z）</option>
                <option value="filename-desc">ファイル名（Z→A）</option>
                <option value="created_at-desc">作成日（新しい順）</option>
                <option value="created_at-asc">作成日（古い順）</option>
              </select>
            </div>

            {folders.length > 0 || sortedImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                {/* フォルダ表示 */}
                {folders.map((folder) => (
                  <div
                    key={`folder-${folder.id}`}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg cursor-pointer group transition-all duration-200 ease-out hover:scale-[1.02] active:scale-95"
                  >
                    <div className="aspect-square bg-gray-50 flex items-center justify-center">
                      <span className="text-6xl">📁</span>
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-gray-900 font-medium truncate">
                        {folder.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">フォルダ</p>
                        {folder.permission_level === 'edit' && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-purple-500 text-white rounded">
                            編集可
                          </span>
                        )}
                        {folder.permission_level === 'download' && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded">
                            DL可
                          </span>
                        )}
                        {folder.permission_level === 'view' && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-gray-500 text-white rounded">
                            閲覧
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 画像表示 */}
                {sortedImages.map((image) => (
                  <div
                    key={image.id}
                    className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg group transition-all duration-200 ease-out hover:scale-[1.02] active:scale-95"
                  >
                    <div
                      className="aspect-square bg-gray-100 relative cursor-pointer select-none"
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                      onClick={() => setPreviewImage(image)}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {isVideo(image) ? (
                        <>
                          {/* 動画プレースホルダー背景（iOS対策） */}
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                          {image.thumbnail_path ? (
                            <img
                              src={getImageUrl(image.thumbnail_path)}
                              alt={image.original_filename}
                              className="w-full h-full object-cover relative z-[1] pointer-events-none"
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          ) : (
                            <video
                              src={`${getImageUrl(image.storage_path)}#t=0.1`}
                              className="w-full h-full object-cover relative z-[1] pointer-events-none"
                              muted
                              playsInline
                              preload="metadata"
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          )}
                          {/* 動画アイコン */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]">
                            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                          {/* 処理中表示 */}
                          {image.processing_status === 'processing' && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded z-[3]">
                              処理中...
                            </div>
                          )}
                        </>
                      ) : (
                        <img
                          src={getImageUrl(image.storage_path)}
                          alt={image.original_filename}
                          className="w-full h-full object-cover pointer-events-none"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      )}
                      {/* 拡大アイコン（ホバー時のみ表示） */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 group-hover:bg-black/20 flex items-center justify-center transition-all pointer-events-none">
                        <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                      {/* 権限レベルバッジ */}
                      <div className="absolute top-1 right-1">
                        {image.permission_level === 'edit' && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-purple-500 text-white rounded">
                            編集可
                          </span>
                        )}
                        {image.permission_level === 'download' && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded">
                            DL可
                          </span>
                        )}
                        {image.permission_level === 'view' && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-gray-500 text-white rounded">
                            閲覧
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-gray-900 truncate">
                        {image.original_filename}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {isVideo(image) ? '動画' : '画像'}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedImage(image); }}
                          className={`px-2 py-0.5 text-[10px] rounded text-white ${
                            image.permission_level === 'view'
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {image.permission_level === 'view' ? '申請' : 'DL'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl">🖼️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {currentFolderId ? 'このフォルダは空です' : '画像がありません'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {currentFolderId
                    ? '他のフォルダを確認してみてください'
                    : 'まだ閲覧できる画像がありません'}
                </p>
                {currentFolderId && (
                  <button
                    onClick={() => setCurrentFolderId(null)}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← ルートに戻る
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* 申請サマリーカード - モダンデザイン */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="group relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⏳</span>
                    <span className="text-xs text-gray-500">承認待ち</span>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    {myRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
              </div>
              <div className="group relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📥</span>
                    <span className="text-xs text-gray-500">DL可能</span>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
                    {myRequests.filter(r => r.status === 'approved').length}
                  </p>
                  {myRequests.filter(r => r.status === 'approved').length > 0 && (
                    <span className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </div>
              </div>
              <div className="group relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">✅</span>
                    <span className="text-xs text-gray-500">DL済み</span>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                    {myRequests.filter(r => r.status === 'downloaded').length}
                  </p>
                </div>
              </div>
              <div className="group relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📝</span>
                    <span className="text-xs text-gray-500">却下/期限切れ</span>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent">
                    {myRequests.filter(r => r.status === 'rejected' || r.status === 'expired').length}
                  </p>
                </div>
              </div>
            </div>

            {myRequests.length > 0 ? (
              <>
                {/* モバイル用カードビュー */}
                <div className="sm:hidden space-y-3">
                  {myRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setRequestDetailModal(request)}
                    >
                      <div className="flex gap-3">
                        {request.image ? (
                          <img
                            src={getImageUrl(request.image.storage_path)}
                            alt=""
                            className="w-16 h-16 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-xs">削除済</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {request.image?.original_filename || '（削除された画像）'}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {request.purpose}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${statusLabels[request.status].class}`}
                            >
                              {statusLabels[request.status].text}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(request.created_at)}
                            </span>
                          </div>
                          {request.status === 'approved' && request.expires_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              期限: {formatDate(request.expires_at)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      {request.status === 'approved' && request.image && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDownloadModal(request); }}
                          className="w-full mt-3 px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                        >
                          ダウンロード
                        </button>
                      )}
                      {request.status === 'approved' && !request.image && (
                        <p className="mt-3 text-xs text-gray-500 text-center">画像が削除されたためダウンロードできません</p>
                      )}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <p className="mt-2 text-xs text-red-600">
                          却下理由: {request.rejection_reason}
                        </p>
                      )}
                      {request.status === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCancellingRequestId(request.id); }}
                          className="w-full mt-3 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                        >
                          キャンセル
                        </button>
                      )}
                      {/* 掲載期限切れのダウンロード済み申請 */}
                      {request.status === 'downloaded' && request.usage_end_date && isExpiredUsage(request.usage_end_date) && (
                        <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                          <p className="text-xs text-orange-700 mb-2">
                            掲載期限: {new Date(request.usage_end_date).toLocaleDateString('ja-JP')}（終了）
                          </p>
                          {request.deletion_confirmed_user && request.deletion_confirmed_approver ? (
                            <span className="text-xs text-green-600 font-medium">掲載終了確認済</span>
                          ) : (
                            <>
                              <p className="text-xs text-red-600 mb-2">
                                {!request.deletion_confirmed_user && '本人未確認 '}
                                {!request.deletion_confirmed_approver && '承認者未確認'}
                              </p>
                              {!request.deletion_confirmed_user && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleConfirmDeletion(request.id); }}
                                  disabled={confirmingDeletionId === request.id}
                                  className="w-full px-3 py-2 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                                >
                                  {confirmingDeletionId === request.id ? '確認中...' : '掲載終了を確認'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* デスクトップ用テーブルビュー */}
                <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          画像
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          利用目的
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ステータス
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          申請日
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {myRequests.map((request) => (
                        <tr
                          key={request.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setRequestDetailModal(request)}
                        >
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center">
                              {request.image ? (
                                <img
                                  src={getImageUrl(request.image.storage_path)}
                                  alt=""
                                  className="w-12 h-12 rounded object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-[10px]">削除済</span>
                                </div>
                              )}
                              <span className="ml-3 text-sm text-gray-500 max-w-[100px] lg:max-w-[150px] truncate">
                                {request.image?.original_filename || '（削除された画像）'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-500 max-w-[150px] lg:max-w-xs truncate">
                            {request.purpose}
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs rounded ${statusLabels[request.status].class}`}
                            >
                              {statusLabels[request.status].text}
                            </span>
                            {request.status === 'approved' && request.expires_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                期限: {formatDate(request.expires_at)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {request.status === 'approved' && request.image && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDownloadModal(request); }}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  ダウンロード
                                </button>
                              )}
                              {request.status === 'approved' && !request.image && (
                                <span className="text-xs text-gray-400">DL不可</span>
                              )}
                              {request.status === 'pending' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCancellingRequestId(request.id); }}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                                >
                                  キャンセル
                                </button>
                              )}
                              {request.status === 'downloaded' && request.usage_end_date && isExpiredUsage(request.usage_end_date) && !request.deletion_confirmed_user && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleConfirmDeletion(request.id); }}
                                  disabled={confirmingDeletionId === request.id}
                                  className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                                >
                                  {confirmingDeletionId === request.id ? '確認中...' : '掲載終了確認'}
                                </button>
                              )}
                              {request.status === 'downloaded' && request.usage_end_date && isExpiredUsage(request.usage_end_date) && request.deletion_confirmed_user && request.deletion_confirmed_approver && (
                                <span className="text-xs text-green-600 font-medium">確認済</span>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setRequestDetailModal(request); }}
                                className="px-3 py-1.5 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                詳細
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl">📋</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  まだ申請がありません
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  画像を選んで最初の利用申請を<br />送信してみましょう！
                </p>
                <button
                  onClick={() => setActiveTab('images')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  🖼️ 画像を選ぶ
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 画像詳細モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              {selectedImage.permission_level === 'view' ? '画像の利用申請' : '画像のダウンロード'}
            </h2>
            {/* Step2（同意書画面）では画像を非表示にしてスペース確保 */}
            {!(selectedImage.permission_level === 'view' && requestStep === 2) && (
              <div className="mb-4">
                {isVideo(selectedImage) ? (
                  <video
                    src={getImageUrl(selectedImage.storage_path)}
                    controls
                    className="w-full max-h-48 sm:max-h-64 object-contain bg-gray-100 rounded"
                  />
                ) : (
                  <img
                    src={getImageUrl(selectedImage.storage_path)}
                    alt={selectedImage.original_filename}
                    className="w-full max-h-48 sm:max-h-64 object-contain bg-gray-100 rounded"
                  />
                )}
                <p className="text-sm text-gray-500 mt-2 truncate">
                  {selectedImage.original_filename}
                </p>
              </div>
            )}

            {/* ダウンロード可/編集可の場合は直接ダウンロード */}
            {(selectedImage.permission_level === 'download' || selectedImage.permission_level === 'edit') && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  この画像はダウンロード権限があります。直接ダウンロードできます。
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetRequestForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={() => {
                      handleDirectDownload(selectedImage.id);
                      resetRequestForm();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    ダウンロード
                  </button>
                </div>
              </>
            )}

            {/* 閲覧のみの場合は申請フォーム（2段階） */}
            {selectedImage.permission_level === 'view' && (
              <>
                {/* ステップインジケーター */}
                <div className="flex items-center justify-center mb-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${requestStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    1
                  </div>
                  <div className={`w-12 h-1 mx-2 ${requestStep === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${requestStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    2
                  </div>
                </div>

                {/* Step 1: 基本情報入力 */}
                {requestStep === 1 && (
                  <div>
                    {/* 利用目的選択 */}
                    <div className="mb-4">
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                        利用目的 *
                        <HelpTip
                          content="画像をどこで使用するか選択してください。適切な目的を選ぶことで、承認がスムーズになります。"
                          size="sm"
                        />
                      </label>
                      <select
                        value={purposeType}
                        onChange={(e) => setPurposeType(e.target.value as PurposeType | '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                      >
                        <option value="">選択してください</option>
                        {Object.entries(purposeTypeLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* その他の場合の入力欄 */}
                    {purposeType === 'other' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          その他の利用目的（詳細）*
                        </label>
                        <textarea
                          value={purposeOther}
                          onChange={(e) => setPurposeOther(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                          placeholder="利用目的の詳細を入力してください"
                        />
                      </div>
                    )}

                    {/* 掲載終了日 */}
                    <div className="mb-4">
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                        掲載終了日 *
                        <HelpTip
                          title="掲載終了日とは？"
                          content="画像の使用を終了する予定日です。この日を過ぎたら、掲載した画像を削除する必要があります。最長1年まで設定可能です。"
                          size="sm"
                        />
                      </label>
                      <input
                        type="date"
                        value={usageEndDate}
                        onChange={(e) => setUsageEndDate(e.target.value)}
                        min={getMinEndDate()}
                        max={getMaxEndDate()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        1年以内の日付を選択してください。期限後は削除確認が必要です。
                      </p>
                    </div>

                    {/* 承認者へのコメント */}
                    <div className="mb-4">
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                        承認者へのコメント（任意）
                        <HelpTip
                          content="承認者に伝えたいことがあれば入力してください。例：「緊急で使用したい」「前回と同じ用途です」など"
                          size="sm"
                        />
                      </label>
                      <textarea
                        value={requesterComment}
                        onChange={(e) => setRequesterComment(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                        placeholder="承認者へ伝えたいことがあれば入力してください"
                        maxLength={500}
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetRequestForm}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={goToConsentStep}
                        disabled={!purposeType || !usageEndDate || (purposeType === 'other' && !purposeOther.trim())}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        次へ
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: 同意書確認 */}
                {requestStep === 2 && (
                  <form onSubmit={handleSubmitRequest}>
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-2">
                        レンタルフォト使用に関する同意書
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        以下の同意書を最後までスクロールしてお読みください。
                      </p>

                      {/* 同意書内容（スクロール必須） */}
                      <div
                        onScroll={handleConsentScroll}
                        className="h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-gray-50 text-xs text-gray-700"
                      >
                        <p className="mb-3">
                          {session?.user?.name || '本人'}は、株式会社レボル（以下「会社」という）が定めるレンタルフォト・ムービーの使用ルールについて、下記の内容を十分に理解し、これを遵守することに同意します。
                        </p>

                        <h4 className="font-bold mb-2">第1条（目的）</h4>
                        <p className="mb-3">
                          本同意書は、会社が提供する画像素材（以下「画像素材」という）の適切な取扱いを定め、著作権その他の権利侵害および関連する法的トラブルを未然に防ぐことを目的とします。
                        </p>

                        <h4 className="font-bold mb-2">第2条（禁止事項）</h4>
                        <p className="mb-2">従業員は、会社が提供する画像素材について、以下の行為を禁止されます。</p>
                        <ul className="list-disc list-inside mb-3 space-y-1">
                          <li>自店舗の広告宣伝目的以外での使用</li>
                          <li>個人SNSや自店舗以外のアカウントでの利用</li>
                          <li>画像素材の編集・加工（例：トリミング、反転、サイズ変更、色調補正、合成 等）</li>
                          <li>画像素材の模倣・類似品制作</li>
                          <li>第三者への貸与、譲渡、販売、再配布</li>
                          <li>その他、会社が不適切と判断し禁止を通達した行為</li>
                        </ul>

                        <h4 className="font-bold mb-2">第3条（使用可能な媒体・用途）</h4>
                        <p className="mb-2">画像素材の使用は、会社が許可した以下の用途および媒体に限ります。</p>
                        <ul className="list-disc list-inside mb-3 space-y-1">
                          <li>自店のホットペッパービューティー掲載ページ</li>
                          <li>自店の公式ホームページおよびブログ</li>
                          <li>自店の公式SNSアカウント</li>
                          <li>自店で使用するチラシ、DM、POPなどの販促物</li>
                          <li>その他、会社が別途許可した媒体</li>
                        </ul>

                        <h4 className="font-bold mb-2">第4条（責任）</h4>
                        <p className="mb-3">
                          従業員が本同意書の内容に違反し、会社に損害が発生した場合、会社は従業員に対して相応の責任を求める場合があります。
                        </p>

                        <h4 className="font-bold mb-2">第5条（管理・確認）</h4>
                        <ul className="list-disc list-inside mb-3 space-y-1">
                          <li>画像素材は、会社が指定する方法・場所で保管すること。</li>
                          <li>必要に応じて、上長または会社担当者の確認を受けること。</li>
                        </ul>

                        <h4 className="font-bold mb-2">第6条（レンタル期間の終了および削除義務）</h4>
                        <ul className="list-disc list-inside mb-3 space-y-1">
                          <li>画像素材のレンタル期間が終了した場合、従業員は、当該画像素材の利用を直ちに中止しなければなりません。</li>
                          <li>前項の場合、従業員は、保有している当該画像素材のデータ（パソコン、スマートフォン、クラウドストレージ、SNSの下書き等を含む）を遅滞なく削除するものとします。</li>
                          <li>削除忘れによる無断利用が発生しないよう、従業員は十分に注意し、自己の管理責任のもと確実に削除を行うものとします。</li>
                        </ul>

                        {/* スクロール完了の目印 */}
                        <div className="mt-4 pt-4 border-t border-gray-300 text-center text-gray-500">
                          ― 同意書はここまでです ―
                        </div>
                      </div>

                      {/* ステータス表示 */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${hasScrolledToBottom ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {hasScrolledToBottom ? '✓' : ''}
                          </span>
                          <span className={hasScrolledToBottom ? 'text-green-600' : 'text-gray-500'}>
                            {hasScrolledToBottom ? '最後までスクロールしました' : '最後までスクロールしてください'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${hasWaitedEnough ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {hasWaitedEnough ? '✓' : remainingSeconds}
                          </span>
                          <span className={hasWaitedEnough ? 'text-green-600' : 'text-gray-500'}>
                            {hasWaitedEnough ? '確認時間が経過しました' : `あと${remainingSeconds}秒お待ちください`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 同意チェックボックス */}
                    <div className="mb-4">
                      <label className={`flex items-start gap-2 ${hasScrolledToBottom && hasWaitedEnough ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          disabled={!hasScrolledToBottom || !hasWaitedEnough}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-700">
                          上記の同意書の内容を確認し、遵守することに同意します。
                        </span>
                      </label>
                    </div>

                    <p className="text-xs text-gray-500 mb-4">
                      申請後、所属長または社長の承認が必要です。
                      承認後7日以内に1回のみダウンロード可能です。
                      ダウンロードした画像には電子透かしが入ります。
                    </p>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={goBackToStep1}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        戻る
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !agreedToTerms}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {submitting ? '送信中...' : '申請する'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 画像プレビューモーダル */}
      {previewImage && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setPreviewImage(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 閉じるボタン */}
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 左矢印 */}
          {hasPrevImage && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 z-10"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 右矢印 */}
          {hasNextImage && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 z-10"
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div
            className="max-w-full max-h-full flex flex-col items-center select-none"
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {isVideo(previewImage) ? (
              <video
                src={getImageUrl(previewImage.preview_path || previewImage.storage_path)}
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <img
                src={getImageUrl(previewImage.storage_path)}
                alt={previewImage.original_filename}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            )}
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-white text-sm text-center">
                {previewImage.original_filename}
                <span className="text-gray-400 ml-2">({currentPreviewIndex + 1} / {sortedImages.length})</span>
              </p>
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setSelectedImage(previewImage);
                }}
                className={`px-4 py-2 rounded-lg text-white text-sm ${
                  previewImage.permission_level === 'view'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {previewImage.permission_level === 'view' ? '利用申請' : 'ダウンロード'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メニュー背景オーバーレイ */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* 申請完了モーダル */}
      {showCompletionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">申請完了</h3>
            <p className="text-sm text-gray-600 mb-4">
              申請を送信しました。<br />
              承認をお待ちください。
            </p>
            <p className="text-xs text-gray-500 mb-4">
              承認されると通知メールが届きます。
            </p>
            <button
              onClick={() => {
                setShowCompletionModal(false);
                setActiveTab('requests');
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              申請履歴を確認する
            </button>
          </div>
        </div>
      )}

      {/* 申請キャンセル確認モーダル */}
      {cancellingRequestId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">申請をキャンセル</h3>
            <p className="text-sm text-gray-600 mb-4">
              この申請をキャンセルしますか？<br />
              この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancellingRequestId(null)}
                disabled={cancelling}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
              >
                戻る
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {cancelling ? 'キャンセル中...' : 'キャンセルする'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ダウンロード確認モーダル */}
      {downloadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">ダウンロード確認</h3>
                <HelpTip
                  title="重要"
                  content="ダウンロードは1回のみです。ダウンロード後は再ダウンロードできませんので、ファイルを大切に保存してください。"
                  highlight
                  size="sm"
                />
              </div>
              <button
                onClick={() => setDownloadModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 画像プレビュー */}
            {downloadModal.image && (
              <div className="mb-4">
                <img
                  src={getImageUrl(downloadModal.image.storage_path)}
                  alt={downloadModal.image.original_filename}
                  className="w-full max-h-48 object-contain bg-gray-100 rounded"
                />
                <p className="text-sm text-gray-500 mt-2 truncate">
                  {downloadModal.image.original_filename}
                </p>
              </div>
            )}

            {/* 申請情報 */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">申請番号:</span>
                <span className="text-gray-900 font-medium">{downloadModal.request_number}</span>
              </div>
              {downloadModal.approver && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">承認者:</span>
                  <span className="text-gray-900">{downloadModal.approver.name}</span>
                </div>
              )}
              {downloadModal.expires_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">ダウンロード期限:</span>
                  <span className="text-gray-900">{formatDate(downloadModal.expires_at)}</span>
                </div>
              )}
            </div>

            {/* 承認者コメント */}
            {downloadModal.approver_comment && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700 mb-1">承認者からのコメント:</p>
                <p className="text-sm text-green-900">{downloadModal.approver_comment}</p>
              </div>
            )}

            {/* 注意事項 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                ※ダウンロードは<strong>1回のみ</strong>可能です。<br />
                ※ダウンロードした画像には電子透かしが埋め込まれます。<br />
                ※掲載終了日を過ぎたら必ず削除してください。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDownloadModal(null)}
                disabled={downloading}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
              >
                閉じる
              </button>
              <button
                onClick={() => handleDownload(downloadModal.id)}
                disabled={downloading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
              >
                {downloading ? 'ダウンロード中...' : 'ダウンロード'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 申請詳細モーダル */}
      {requestDetailModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">申請詳細</h3>
              <button
                onClick={() => setRequestDetailModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 画像プレビュー */}
            <div className="mb-4">
              {requestDetailModal.image ? (
                <img
                  src={getImageUrl(requestDetailModal.image.storage_path)}
                  alt={requestDetailModal.image.original_filename}
                  className="w-full max-h-64 object-contain bg-gray-100 rounded"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-400">画像は削除されました</span>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2 text-center">
                {requestDetailModal.image?.original_filename || '（削除された画像）'}
              </p>
            </div>

            {/* ステータス */}
            <div className="mb-4 text-center">
              <span className={`inline-block px-4 py-2 text-sm font-medium rounded-full ${statusLabels[requestDetailModal.status].class}`}>
                {statusLabels[requestDetailModal.status].text}
              </span>
            </div>

            {/* 申請情報 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">申請番号:</span>
                <span className="text-gray-900 font-medium">{requestDetailModal.request_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">申請日:</span>
                <span className="text-gray-900">{formatDate(requestDetailModal.created_at)}</span>
              </div>
              {requestDetailModal.approver && (
                <div className="flex justify-between">
                  <span className="text-gray-500">承認者:</span>
                  <span className="text-gray-900">{requestDetailModal.approver.name}</span>
                </div>
              )}
              {requestDetailModal.expires_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">ダウンロード期限:</span>
                  <span className="text-gray-900">{formatDate(requestDetailModal.expires_at)}</span>
                </div>
              )}
            </div>

            {/* 利用目的 */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">利用目的:</p>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-900">
                {requestDetailModal.purpose}
              </div>
            </div>

            {/* 承認者コメント */}
            {requestDetailModal.approver_comment && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700 mb-1">承認者からのコメント:</p>
                <p className="text-sm text-green-900">{requestDetailModal.approver_comment}</p>
              </div>
            )}

            {/* 却下理由 */}
            {requestDetailModal.status === 'rejected' && requestDetailModal.rejection_reason && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs font-medium text-red-700 mb-1">却下理由:</p>
                <p className="text-sm text-red-900">{requestDetailModal.rejection_reason}</p>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex gap-3">
              <button
                onClick={() => setRequestDetailModal(null)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                閉じる
              </button>
              {requestDetailModal.status === 'approved' && requestDetailModal.image && (
                <button
                  onClick={() => {
                    setRequestDetailModal(null);
                    setDownloadModal(requestDetailModal);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  ダウンロード
                </button>
              )}
              {requestDetailModal.status === 'approved' && !requestDetailModal.image && (
                <span className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm text-center">
                  画像削除済み
                </span>
              )}
              {requestDetailModal.status === 'pending' && (
                <button
                  onClick={() => {
                    setRequestDetailModal(null);
                    setCancellingRequestId(requestDetailModal.id);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  申請をキャンセル
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* エラーモーダル */}
      {errorModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{errorModal.title}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {errorModal.message}
            </p>
            <button
              onClick={() => setErrorModal(null)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
