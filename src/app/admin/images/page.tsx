'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import HelpTip from '@/components/HelpTip';
import ConfirmModal from '@/components/ConfirmModal';

type DefaultPermission = 'none' | 'view' | 'download' | 'edit';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  default_permission?: DefaultPermission;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Permission {
  id: string;
  user_id: string;
  user: User;
}

interface Image {
  id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  folder_id: string | null;
  folder: Folder | null;
  permissions?: Permission[];
  created_at: string;
  file_type?: 'image' | 'video';
  mime_type?: string;
}

type SortKey = 'filename' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function ImagesPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFolderPermissionModal, setShowFolderPermissionModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, 'view' | 'download' | 'edit'>>({});
  const [folderDefaultPermission, setFolderDefaultPermission] = useState<DefaultPermission>('none');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null | 'root'>(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<Image | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [moving, setMoving] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  // 選択をクリア（フォルダ移動時など）
  useEffect(() => {
    setSelectedFolderIds(new Set());
    setSelectedImageIds(new Set());
  }, [currentFolderId]);

  function toggleFolderSelection(folderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedFolderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }

  function toggleImageSelection(imageId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedImageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }

  function selectAll() {
    setSelectedFolderIds(new Set(folders.map(f => f.id)));
    setSelectedImageIds(new Set(images.map(i => i.id)));
  }

  function clearSelection() {
    setSelectedFolderIds(new Set());
    setSelectedImageIds(new Set());
  }

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showBulkPermissionModal, setShowBulkPermissionModal] = useState(false);
  const [bulkPermissionLevel, setBulkPermissionLevel] = useState<'view' | 'download' | 'edit' | 'none'>('view');

  async function handleBulkPermission() {
    const imageCount = selectedImageIds.size;
    const folderCount = selectedFolderIds.size;
    if (imageCount === 0 && folderCount === 0) return;

    // 権限なしの場合は既存権限を削除
    const usersWithPermission = Object.entries(userPermissions).filter(([, level]) => level !== undefined);

    if (usersWithPermission.length === 0 && bulkPermissionLevel !== 'none') {
      alert('権限を設定するユーザーを選択してください');
      return;
    }

    try {
      const permissions = usersWithPermission.map(([user_id, level]) => ({
        user_id,
        level,
      }));

      // 並列実行で高速化
      await Promise.all([
        ...Array.from(selectedImageIds).map(imageId =>
          fetch(`/api/admin/images/${imageId}/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions }),
          })
        ),
        ...Array.from(selectedFolderIds).map(folderId =>
          fetch(`/api/admin/folders/${folderId}/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions }),
          })
        ),
      ]);

      setShowBulkPermissionModal(false);
      setUserPermissions({});
      clearSelection();
      fetchData();
      alert('権限を設定しました');
    } catch (error) {
      console.error('Bulk permission failed:', error);
      alert('一括権限設定に失敗しました');
    }
  }

  function handleBulkDelete() {
    const folderCount = selectedFolderIds.size;
    const imageCount = selectedImageIds.size;
    if (folderCount === 0 && imageCount === 0) return;

    const message = `${folderCount > 0 ? `${folderCount}個のフォルダ` : ''}${folderCount > 0 && imageCount > 0 ? 'と' : ''}${imageCount > 0 ? `${imageCount}枚の画像` : ''}を削除しますか？`;

    setConfirmModal({
      isOpen: true,
      title: '一括削除の確認',
      message,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await Promise.all([
            ...Array.from(selectedFolderIds).map(folderId =>
              fetch(`/api/admin/folders/${folderId}`, { method: 'DELETE' })
            ),
            ...Array.from(selectedImageIds).map(imageId =>
              fetch(`/api/admin/images/${imageId}`, { method: 'DELETE' })
            ),
          ]);
          clearSelection();
          fetchData();
        } catch (error) {
          console.error('Bulk delete failed:', error);
          alert('一括削除に失敗しました');
        }
      },
    });
  }

  async function handleBulkMove(targetFolderId: string | null) {
    const folderCount = selectedFolderIds.size;
    const imageCount = selectedImageIds.size;
    if (folderCount === 0 && imageCount === 0) return;

    setMoving(true);
    setShowMoveModal(false);
    try {
      // 並列実行で高速化
      await Promise.all([
        ...Array.from(selectedFolderIds)
          .filter(folderId => folderId !== targetFolderId)
          .map(folderId =>
            fetch(`/api/admin/folders/${folderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parent_id: targetFolderId }),
            })
          ),
        ...Array.from(selectedImageIds).map(imageId =>
          fetch(`/api/admin/images/${imageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: targetFolderId }),
          })
        ),
      ]);
      clearSelection();
      fetchData();
    } catch (error) {
      console.error('Bulk move failed:', error);
      alert('一括移動に失敗しました');
    } finally {
      setMoving(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

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
      const url = currentFolderId
        ? `/api/admin/images?folder_id=${currentFolderId}`
        : '/api/admin/images';

      const [imagesRes, foldersRes, usersRes] = await Promise.all([
        fetch(url),
        fetch('/api/admin/folders'),
        fetch('/api/admin/users'),
      ]);

      const imagesData = await imagesRes.json();
      const foldersData = await foldersRes.json();
      const usersData = await usersRes.json();

      if (imagesData.success) setImages(imagesData.data);
      if (foldersData.success) {
        setAllFolders(foldersData.flat);
        const childFolders = foldersData.flat.filter(
          (f: Folder) => f.parent_id === currentFolderId
        );
        setFolders(childFolders);
        setBreadcrumbs(buildBreadcrumbs(currentFolderId, foldersData.flat));
      }
      if (usersData.success) setUsers(usersData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    // 内部ドラッグ（画像移動）の場合はスキップ
    if (draggingImageId) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    // 内部ドラッグ（画像・フォルダ移動）の場合はスキップ
    if (draggingImageId || draggingFolderId) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // 内部ドラッグ（画像・フォルダ移動）の場合はスキップ
    if (draggingImageId || draggingFolderId) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    // 内部ドラッグ（画像・フォルダ移動）の場合はスキップ
    if (draggingImageId || draggingFolderId) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (uploading) return;

    const items = e.dataTransfer.items;
    const files: File[] = [];
    const folderFiles: { folderName: string; file: File }[] = [];

    if (items && items.length > 0) {
      const entries: FileSystemEntry[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            entries.push(entry);
          }
        }
      }

      for (const entry of entries) {
        if (entry.isFile) {
          const file = await getFileFromEntry(entry as FileSystemFileEntry);
          if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            files.push(file);
          }
        } else if (entry.isDirectory) {
          const dirFiles = await readDirectoryEntry(entry as FileSystemDirectoryEntry, entry.name);
          folderFiles.push(...dirFiles);
        }
      }
    }

    if (folderFiles.length > 0) {
      await uploadFolderFiles(folderFiles);
    } else if (files.length > 0) {
      await uploadFiles(files);
    }
  }

  function getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
    return new Promise((resolve) => {
      entry.file(
        (file) => resolve(file),
        () => resolve(null)
      );
    });
  }

  async function readDirectoryEntry(
    dirEntry: FileSystemDirectoryEntry,
    folderName: string
  ): Promise<{ folderName: string; file: File }[]> {
    const results: { folderName: string; file: File }[] = [];
    const reader = dirEntry.createReader();

    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    // readEntries()は一度に最大100エントリしか返さないため、ループで全て取得
    let entries = await readEntries();
    while (entries.length > 0) {
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await getFileFromEntry(entry as FileSystemFileEntry);
          if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            results.push({ folderName, file });
          }
        } else if (entry.isDirectory) {
          // サブフォルダを再帰的に処理（すべてのファイルを親フォルダに集約）
          const subResults = await readDirectoryEntry(
            entry as FileSystemDirectoryEntry,
            folderName // 同じフォルダ名を使用して親に集約
          );
          results.push(...subResults);
        }
      }
      entries = await readEntries();
    }

    return results;
  }

  // 対応ファイル形式
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  function isAllowedFile(file: File): boolean {
    return allowedTypes.includes(file.type) || file.type.startsWith('image/') || file.type.startsWith('video/');
  }

  // 直接Supabase Storageにアップロード（署名付きURL使用）
  async function uploadFileDirectly(file: File, folderId: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 署名付きURLを取得
      const urlRes = await fetch('/api/admin/images/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          folderId,
        }),
      });

      const urlData = await urlRes.json();
      if (!urlData.success) {
        return { success: false, error: urlData.error || 'URL取得失敗' };
      }

      // 2. 署名付きURLを使ってSupabaseに直接アップロード
      const { signedUrl, path, filename, originalFilename, contentType, fileSize, isVideo } = urlData.data;

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        return { success: false, error: `アップロード失敗 (${uploadRes.status})` };
      }

      // 3. DBに登録
      const registerRes = await fetch('/api/admin/images/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          filename,
          originalFilename,
          contentType,
          fileSize,
          folderId,
          isVideo,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerData.success) {
        return { success: false, error: registerData.error || '登録失敗' };
      }

      return { success: true };
    } catch (error) {
      console.error('Direct upload error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'アップロードエラー' };
    }
  }

  async function uploadFiles(files: File[]) {
    // クライアント側でファイルをフィルタリング
    const validFiles: File[] = [];
    const skipped: string[] = [];

    for (const file of files) {
      if (isAllowedFile(file)) {
        validFiles.push(file);
      } else {
        skipped.push(`${file.name} (${file.type || '不明な形式'})`);
      }
    }

    setSkippedFiles(skipped);

    if (validFiles.length === 0) {
      if (skipped.length > 0) {
        setUploadErrors([`対応形式のファイルがありませんでした。対応形式: 画像(JPEG, PNG, WebP, GIF) / 動画(MP4, WebM, MOV, AVI, MKV)`]);
      }
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });
    setUploadErrors([]);
    const errors: string[] = [];
    let completedCount = 0;

    // 単一ファイルのアップロード関数（直接アップロード方式）
    async function uploadSingleFile(file: File): Promise<void> {
      try {
        const result = await uploadFileDirectly(file, currentFolderId);
        if (!result.success) {
          errors.push(`${file.name}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = `${file.name}: ${error instanceof Error ? error.message : 'アップロードエラー'}`;
        console.error(errorMsg, error);
        errors.push(errorMsg);
      } finally {
        completedCount++;
        setUploadProgress({ current: completedCount, total: validFiles.length });
      }
    }

    try {
      // 並列アップロード（同時5ファイル）で高速化
      const CONCURRENCY = 5;
      for (let i = 0; i < validFiles.length; i += CONCURRENCY) {
        const batch = validFiles.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(uploadSingleFile));
      }

      fetchData();
      if (errors.length > 0) {
        setUploadErrors(errors);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadErrors([`アップロード処理中にエラーが発生しました: ${error}`]);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }

  async function uploadFolderFiles(folderFiles: { folderName: string; file: File }[]) {
    // クライアント側でファイルをフィルタリング
    const validFolderFiles: { folderName: string; file: File }[] = [];
    const skipped: string[] = [];

    for (const { folderName: fName, file } of folderFiles) {
      if (isAllowedFile(file)) {
        validFolderFiles.push({ folderName: fName, file });
      } else {
        skipped.push(`${file.name} (${file.type || '不明な形式'})`);
      }
    }

    setSkippedFiles(skipped);

    if (validFolderFiles.length === 0) {
      if (skipped.length > 0) {
        setUploadErrors([`対応形式のファイルがありませんでした。対応形式: 画像(JPEG, PNG, WebP, GIF) / 動画(MP4, WebM, MOV, AVI, MKV)`]);
      }
      return;
    }

    const folderGroups = new Map<string, File[]>();
    for (const { folderName: fName, file } of validFolderFiles) {
      if (!folderGroups.has(fName)) {
        folderGroups.set(fName, []);
      }
      folderGroups.get(fName)!.push(file);
    }

    setUploading(true);
    setUploadErrors([]);
    const errors: string[] = [];
    const totalFiles = validFolderFiles.length;
    let completedCount = 0;
    setUploadProgress({ current: 0, total: totalFiles });

    // 単一ファイルのアップロード関数（直接アップロード方式）
    async function uploadSingleFile(file: File, targetFolderId: string | null): Promise<void> {
      try {
        const result = await uploadFileDirectly(file, targetFolderId);
        if (!result.success) {
          errors.push(`${file.name}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = `${file.name}: ${error instanceof Error ? error.message : 'アップロードエラー'}`;
        console.error(errorMsg, error);
        errors.push(errorMsg);
      } finally {
        completedCount++;
        setUploadProgress({ current: completedCount, total: totalFiles });
      }
    }

    try {
      for (const [name, files] of folderGroups) {
        let targetFolderId = currentFolderId;
        try {
          const folderRes = await fetch('/api/admin/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              parent_id: currentFolderId || null,
            }),
          });

          const folderData = await folderRes.json();
          if (folderData.success) {
            targetFolderId = folderData.data.id;
          }
        } catch (error) {
          console.error('Failed to create folder:', error);
          errors.push(`フォルダ「${name}」の作成に失敗`);
        }

        // 並列アップロード（同時5ファイル）で高速化
        const CONCURRENCY = 5;
        for (let i = 0; i < files.length; i += CONCURRENCY) {
          const batch = files.slice(i, i + CONCURRENCY);
          await Promise.all(batch.map(f => uploadSingleFile(f, targetFolderId)));
        }
      }

      fetchData();
      if (errors.length > 0) {
        setUploadErrors(errors);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadErrors([`アップロード処理中にエラーが発生しました: ${error}`]);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFolderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    const fName = pathParts[0];

    // すべてのファイルをuploadFolderFilesに渡し、フィルタリングはそこで行う
    const folderFilesList: { folderName: string; file: File }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      folderFilesList.push({ folderName: fName, file });
    }

    if (folderFilesList.length > 0) {
      await uploadFolderFiles(folderFilesList);
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          parent_id: currentFolderId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowFolderModal(false);
        setFolderName('');
        fetchData();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('フォルダの作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditFolder() {
    if (!editingFolder || !folderName.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          parent_id: editingFolder.parent_id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowFolderModal(false);
        setFolderName('');
        setEditingFolder(null);
        fetchData();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Failed to edit folder:', error);
      alert('フォルダの編集に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteFolder(id: string) {
    setConfirmModal({
      isOpen: true,
      title: 'フォルダの削除',
      message: 'このフォルダと中の画像をすべて削除しますか？',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/folders/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            fetchData();
          } else {
            alert(data.error || 'エラーが発生しました');
          }
        } catch (error) {
          console.error('Failed to delete folder:', error);
          alert('フォルダの削除に失敗しました');
        }
      },
    });
  }

  function handleDeleteImage(id: string) {
    setConfirmModal({
      isOpen: true,
      title: '画像の削除',
      message: 'この画像を削除しますか？',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/images/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            fetchData();
          } else {
            alert(data.error || 'エラーが発生しました');
          }
        } catch (error) {
          console.error('Failed to delete image:', error);
          alert('画像の削除に失敗しました');
        }
      },
    });
  }

  async function handleMoveImage(imageId: string, targetFolderId: string | null) {
    try {
      const res = await fetch(`/api/admin/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: targetFolderId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '移動に失敗しました');
      }
    } catch (error) {
      console.error('Failed to move image:', error);
      alert('画像の移動に失敗しました');
    }
  }

  function handleImageDragStart(e: React.DragEvent, imageId: string) {
    // 選択されていない画像をドラッグ開始した場合、その画像のみを対象に
    // 選択されている画像をドラッグ開始した場合、選択されているすべてのアイテムを対象に
    if (!selectedImageIds.has(imageId)) {
      setSelectedImageIds(new Set([imageId]));
      setSelectedFolderIds(new Set());
    }
    setDraggingImageId(imageId);
    setDraggingFolderId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `image:${imageId}`);
  }

  function handleFolderItemDragStart(e: React.DragEvent, folderId: string) {
    // 選択されていないフォルダをドラッグ開始した場合、そのフォルダのみを対象に
    // 選択されているフォルダをドラッグ開始した場合、選択されているすべてのアイテムを対象に
    if (!selectedFolderIds.has(folderId)) {
      setSelectedFolderIds(new Set([folderId]));
      setSelectedImageIds(new Set());
    }
    setDraggingFolderId(folderId);
    setDraggingImageId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `folder:${folderId}`);
  }

  function handleDragEnd() {
    setDraggingImageId(null);
    setDraggingFolderId(null);
    setDropTargetFolderId(null);
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: string | null) {
    if (!draggingImageId && !draggingFolderId) return;
    // フォルダを自分自身や選択中のフォルダにはドロップできない
    if (draggingFolderId && (folderId === draggingFolderId || selectedFolderIds.has(folderId || ''))) return;
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(folderId === null ? 'root' : folderId);
  }

  function handleFolderDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(null);
  }

  async function handleFolderDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggingImageId && !draggingFolderId) return;

    setMoving(true);
    try {
      // 並列実行で高速化
      await Promise.all([
        ...Array.from(selectedImageIds).map(imageId =>
          fetch(`/api/admin/images/${imageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: targetFolderId }),
          })
        ),
        ...Array.from(selectedFolderIds)
          .filter(folderId => folderId !== targetFolderId)
          .map(folderId =>
            fetch(`/api/admin/folders/${folderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parent_id: targetFolderId }),
            })
          ),
      ]);

      clearSelection();
      fetchData();
    } catch (error) {
      console.error('Failed to move items:', error);
      alert('移動に失敗しました');
    } finally {
      setMoving(false);
    }

    setDraggingImageId(null);
    setDraggingFolderId(null);
    setDropTargetFolderId(null);
  }

  function openPermissionModal(image: Image) {
    setSelectedImage(image);
    // 既存の権限を読み込む
    fetch(`/api/admin/images/${image.id}/permissions`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const perms: Record<string, 'view' | 'download' | 'edit'> = {};
          data.data.forEach((p: { user_id: string; level: 'view' | 'download' | 'edit' }) => {
            perms[p.user_id] = p.level || 'view';
          });
          setUserPermissions(perms);
        }
      });
    setShowPermissionModal(true);
  }

  function openFolderPermissionModal(folder: Folder) {
    setEditingFolder(folder);
    setUserPermissions({});
    setFolderDefaultPermission(folder.default_permission || 'none');
    setShowFolderPermissionModal(true);
    fetch(`/api/admin/folders/${folder.id}/permissions`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const perms: Record<string, 'view' | 'download' | 'edit'> = {};
          data.data.forEach((p: { user_id: string; level: 'view' | 'download' | 'edit' }) => {
            perms[p.user_id] = p.level || 'view';
          });
          setUserPermissions(perms);
        }
      });
  }

  function setUserPermissionLevel(userId: string, level: 'view' | 'download' | 'edit' | 'none') {
    setUserPermissions(prev => {
      const newPerms = { ...prev };
      if (level === 'none') {
        delete newPerms[userId];
      } else {
        newPerms[userId] = level;
      }
      return newPerms;
    });
  }

  async function handleSavePermissions() {
    if (!selectedImage) return;
    setSaving(true);

    try {
      const permissions = Object.entries(userPermissions).map(([user_id, level]) => ({
        user_id,
        level,
      }));

      const res = await fetch(`/api/admin/images/${selectedImage.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });

      const data = await res.json();
      if (data.success) {
        setShowPermissionModal(false);
        setSelectedImage(null);
        fetchData();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('権限の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFolderPermissions() {
    if (!editingFolder) return;
    setSaving(true);

    try {
      // デフォルト権限を保存
      const folderRes = await fetch(`/api/admin/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_permission: folderDefaultPermission }),
      });

      const folderData = await folderRes.json();
      if (!folderData.success) {
        alert(folderData.error || 'デフォルト権限の保存に失敗しました');
        return;
      }

      // 個別ユーザー権限を保存
      const permissions = Object.entries(userPermissions).map(([user_id, level]) => ({
        user_id,
        level,
      }));

      const res = await fetch(`/api/admin/folders/${editingFolder.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });

      const data = await res.json();
      if (data.success) {
        setShowFolderPermissionModal(false);
        setEditingFolder(null);
        // フォルダリストを更新
        fetchData();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Failed to save folder permissions:', error);
      alert('権限の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function getImageUrl(storagePath: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${storagePath}`;
  }

  function isVideo(image: Image) {
    return image.file_type === 'video' || image.mime_type?.startsWith('video/');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative min-h-[calc(100vh-200px)]"
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 rounded-lg z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg p-8 shadow-lg text-center">
            <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xl font-bold text-gray-900">ドロップしてアップロード</p>
            <p className="text-sm text-gray-500 mt-2">画像ファイルまたはフォルダをドロップ</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ファイル管理</h1>
          <HelpTip content="フォルダと画像を管理します。ドラッグ＆ドロップでアップロード可能。チェックボックスで複数選択し、一括移動・削除・権限設定ができます。選択したアイテムをドラッグして別のフォルダに移動することも可能です。" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setEditingFolder(null); setFolderName(''); setShowFolderModal(true); }}
            className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
          >
            📁 新規フォルダ
          </button>
          {/* アップロードボタン（統合ドロップダウン） */}
          <div className="relative">
            <button
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              disabled={uploading}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
            >
              {uploading ? `📤 ${uploadProgress.current}/${uploadProgress.total}` : '📤 アップロード'}
              <svg className={`w-4 h-4 transition-transform ${showUploadMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showUploadMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700">
                  📷 ファイルを選択
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
                    multiple
                    onChange={(e) => { handleFileUpload(e); setShowUploadMenu(false); }}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 border-t border-gray-100">
                  📂 フォルダごと
                  <input
                    ref={folderInputRef}
                    type="file"
                    accept="image/*,video/*"
                    /* @ts-expect-error webkitdirectory is not in types */
                    webkitdirectory="true"
                    onChange={(e) => { handleFolderUpload(e); setShowUploadMenu(false); }}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="image/*,video/*"
            /* @ts-expect-error webkitdirectory is not in types */
            webkitdirectory="true"
            onChange={handleFolderUpload}
            disabled={uploading}
            className="hidden"
          />
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
          >
            {viewMode === 'grid' ? '📋 リスト' : '📊 グリッド'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 text-sm overflow-x-auto pb-2 bg-gray-100 rounded-lg px-3 py-2">
        <button
          onClick={() => setCurrentFolderId(null)}
          onDragOver={(e) => handleFolderDragOver(e, null)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, null)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md whitespace-nowrap ${
            !currentFolderId
              ? 'bg-blue-600 text-white font-medium shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
          } ${dropTargetFolderId === 'root' ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
        >
          🏠 ルート
        </button>
        {breadcrumbs.map((folder, index) => (
          <span key={folder.id} className="flex items-center gap-1">
            <span className="text-gray-400 mx-1">›</span>
            <button
              onClick={() => setCurrentFolderId(folder.id)}
              onDragOver={(e) => handleFolderDragOver(e, folder.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, folder.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                index === breadcrumbs.length - 1
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
              } ${dropTargetFolderId === folder.id ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
            >
              📁 {folder.name}
            </button>
          </span>
        ))}
      </div>

      {/* スキップされたファイル通知 */}
      {skippedFiles.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">
              スキップしたファイル ({skippedFiles.length}件)
            </span>
            <button
              onClick={() => setSkippedFiles([])}
              className="text-xs text-yellow-600 hover:text-yellow-800"
            >
              閉じる
            </button>
          </div>
          <p className="text-xs text-yellow-600 mb-2">
            対応形式: 画像(JPEG, PNG, WebP, GIF) / 動画(MP4, WebM, MOV, AVI, MKV)
          </p>
          <div className="max-h-32 overflow-y-auto text-xs text-yellow-700 space-y-1">
            {skippedFiles.map((file, i) => (
              <div key={i} className="flex items-start gap-1">
                <span className="text-yellow-400">•</span>
                <span>{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アップロードエラー表示 */}
      {uploadErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">
              アップロードエラー ({uploadErrors.length}件)
            </span>
            <button
              onClick={() => setUploadErrors([])}
              className="text-xs text-red-600 hover:text-red-800"
            >
              閉じる
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto text-xs text-red-600 space-y-1">
            {uploadErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-1">
                <span className="text-red-400">•</span>
                <span>{err}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentFolderId && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              📁 {breadcrumbs[breadcrumbs.length - 1]?.name}
            </span>
            <HelpTip content="フォルダ権限は、フォルダ内の画像に動的に適用されます。画像を別フォルダに移動すると、移動先フォルダの権限が適用されます（画像個別の権限設定がある場合はそちらが優先）。" />
          </div>
          <button
            onClick={() => {
              const folder = allFolders.find(f => f.id === currentFolderId);
              if (folder) openFolderPermissionModal(folder);
            }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            フォルダ権限設定
          </button>
        </div>
      )}

      {/* 一括操作バー */}
      {(selectedFolderIds.size > 0 || selectedImageIds.size > 0) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-700 font-medium">
              {selectedFolderIds.size > 0 && `${selectedFolderIds.size}フォルダ`}
              {selectedFolderIds.size > 0 && selectedImageIds.size > 0 && ' + '}
              {selectedImageIds.size > 0 && `${selectedImageIds.size}画像`}
              {' '}選択中
            </span>
            <HelpTip content="選択したアイテムをドラッグして別のフォルダやパンくずリストにドロップすると移動できます。「権限設定」で一括権限変更、「移動」で移動先選択、「削除」で一括削除が可能です。" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            >
              すべて選択
            </button>
            <button
              onClick={() => { setUserPermissions({}); setShowBulkPermissionModal(true); }}
              className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              権限設定
            </button>
            <button
              onClick={() => setShowMoveModal(true)}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              移動
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
            >
              選択解除
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              削除
            </button>
          </div>
        </div>
      )}

      {/* 並び替えUI */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className="text-xs text-gray-500">並び替え:</span>
        <select
          value={`${sortKey}-${sortOrder}`}
          onChange={(e) => {
            const [key, order] = e.target.value.split('-') as [SortKey, SortOrder];
            setSortKey(key);
            setSortOrder(order);
          }}
          className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="created_at-desc">作成日（新しい順）</option>
          <option value="created_at-asc">作成日（古い順）</option>
          <option value="filename-asc">ファイル名（A→Z）</option>
          <option value="filename-desc">ファイル名（Z→A）</option>
        </select>
      </div>

      {viewMode === 'grid' ? (
        <div className="relative">
          {/* 移動中オーバーレイ */}
          {moving && (
            <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">移動中...</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {folders.map((folder) => (
            <div
              key={`folder-${folder.id}`}
              draggable
              onDragStart={(e) => handleFolderItemDragStart(e, folder.id)}
              onDragEnd={handleDragEnd}
              className={`relative bg-white rounded-lg shadow hover:shadow-md cursor-pointer group transition-all duration-200 ease-out ${
                dropTargetFolderId === folder.id && !selectedFolderIds.has(folder.id) ? 'ring-2 ring-blue-500 bg-blue-50 scale-105' : ''
              } ${draggingFolderId && selectedFolderIds.has(folder.id) ? 'opacity-50 ring-2 ring-blue-500 scale-95' : ''}
              ${selectedFolderIds.has(folder.id) && !draggingFolderId ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
              hover:scale-[1.02] active:scale-95`}
              onDragOver={(e) => handleFolderDragOver(e, folder.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, folder.id)}
              onClick={() => !draggingFolderId && setCurrentFolderId(folder.id)}
            >
              <div
                onClick={(e) => toggleFolderSelection(folder.id, e)}
                className={`absolute top-1 left-1 w-6 h-6 flex items-center justify-center rounded border-2 cursor-pointer z-10 ${
                  selectedFolderIds.has(folder.id)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {selectedFolderIds.has(folder.id) && '✓'}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-xs bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 z-10"
                title="削除"
              >
                ✕
              </button>
              <div className="p-4 text-center">
                <div className="text-5xl mb-2">{dropTargetFolderId === folder.id ? '📂' : '📁'}</div>
                <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
              </div>
              <div className="px-2 pb-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderName(folder.name); setShowFolderModal(true); }}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  編集
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openFolderPermissionModal(folder); }}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  権限
                </button>
              </div>
            </div>
          ))}

          {sortedImages.map((image) => (
            <div
              key={`image-${image.id}`}
              draggable
              onDragStart={(e) => handleImageDragStart(e, image.id)}
              onDragEnd={handleDragEnd}
              className={`relative bg-white rounded-lg shadow hover:shadow-md group cursor-grab active:cursor-grabbing transition-all duration-200 ease-out ${
                (draggingImageId || draggingFolderId) && selectedImageIds.has(image.id) ? 'opacity-50 ring-2 ring-blue-500 scale-95' : ''
              } ${selectedImageIds.has(image.id) && !draggingImageId && !draggingFolderId ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
              hover:scale-[1.02] active:scale-95`}
            >
              <div
                onClick={(e) => toggleImageSelection(image.id, e)}
                className={`absolute top-1 left-1 w-6 h-6 flex items-center justify-center rounded border-2 cursor-pointer z-10 ${
                  selectedImageIds.has(image.id)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {selectedImageIds.has(image.id) && '✓'}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }}
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-xs bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 z-10"
                title="削除"
              >
                ✕
              </button>
              <div
                className="aspect-square overflow-hidden rounded-t-lg bg-gray-100 cursor-pointer relative"
                onClick={() => setPreviewImage(image)}
              >
                {isVideo(image) ? (
                  <>
                    <video
                      src={getImageUrl(image.storage_path)}
                      className="w-full h-full object-cover pointer-events-none"
                      muted
                      preload="metadata"
                    />
                    {/* 動画アイコン */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={getImageUrl(image.storage_path)}
                    alt={image.original_filename}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}
                {/* 拡大アイコン（ホバー時のみ表示） */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all pointer-events-none">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-900 truncate" title={image.original_filename}>
                  {image.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {image.permissions?.length || 0}人に許可
                </p>
              </div>
              <div className="px-2 pb-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); openPermissionModal(image); }}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  権限
                </button>
              </div>
            </div>
          ))}

          {folders.length === 0 && images.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500">
              <div className="text-5xl mb-4">📂</div>
              <p>フォルダまたは画像をドラッグ＆ドロップしてアップロード</p>
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                  <div
                    onClick={() => {
                      if (selectedFolderIds.size + selectedImageIds.size === folders.length + images.length) {
                        clearSelection();
                      } else {
                        selectAll();
                      }
                    }}
                    className={`w-5 h-5 flex items-center justify-center rounded border-2 cursor-pointer ${
                      selectedFolderIds.size + selectedImageIds.size === folders.length + images.length && folders.length + images.length > 0
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {selectedFolderIds.size + selectedImageIds.size === folders.length + images.length && folders.length + images.length > 0 && '✓'}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">タイプ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">権限</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {folders.map((folder) => (
                <tr
                  key={`folder-${folder.id}`}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    dropTargetFolderId === folder.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''
                  } ${selectedFolderIds.has(folder.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => setCurrentFolderId(folder.id)}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                >
                  <td className="px-4 py-3">
                    <div
                      onClick={(e) => toggleFolderSelection(folder.id, e)}
                      className={`w-5 h-5 flex items-center justify-center rounded border-2 cursor-pointer ${
                        selectedFolderIds.has(folder.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {selectedFolderIds.has(folder.id) && '✓'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{dropTargetFolderId === folder.id ? '📂' : '📁'}</span>
                      <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">フォルダ</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">-</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderName(folder.name); setShowFolderModal(true); }}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      編集
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openFolderPermissionModal(folder); }}
                      className="text-purple-600 hover:text-purple-800 text-sm mr-3"
                    >
                      権限
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
              {sortedImages.map((image) => (
                <tr
                  key={`image-${image.id}`}
                  draggable
                  onDragStart={(e) => handleImageDragStart(e, image.id)}
                  onDragEnd={handleDragEnd}
                  className={`hover:bg-gray-50 cursor-grab active:cursor-grabbing ${
                    draggingImageId === image.id ? 'opacity-50 bg-blue-50' : ''
                  } ${selectedImageIds.has(image.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div
                      onClick={(e) => toggleImageSelection(image.id, e)}
                      className={`w-5 h-5 flex items-center justify-center rounded border-2 cursor-pointer ${
                        selectedImageIds.has(image.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {selectedImageIds.has(image.id) && '✓'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isVideo(image) ? (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(image.storage_path)}
                          alt=""
                          className="w-8 h-8 object-cover rounded pointer-events-none"
                        />
                      )}
                      <span className="text-sm text-gray-900 truncate max-w-[150px] sm:max-w-none">
                        {image.original_filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                    {isVideo(image) ? '動画' : '画像'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {image.permissions?.length || 0}人
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openPermissionModal(image)}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      権限
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
              {folders.length === 0 && images.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-500">
                    フォルダまたは画像をドラッグ＆ドロップしてアップロード
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showFolderModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFolder ? 'フォルダを編集' : '新規フォルダ'}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                フォルダ名 *
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="フォルダ名を入力"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowFolderModal(false); setFolderName(''); setEditingFolder(null); }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={editingFolder ? handleEditFolder : handleCreateFolder}
                disabled={saving || !folderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionModal && selectedImage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              画像の権限設定
            </h2>
            <p className="text-sm text-gray-500 mb-2">{selectedImage.original_filename}</p>
            <div className="text-xs text-gray-700 mb-4 space-y-1 bg-gray-100 p-3 rounded-lg border border-gray-300">
              <div>・<span className="font-bold text-gray-900">閲覧のみ</span>: 画像を見れるが申請が必要</div>
              <div>・<span className="font-bold text-gray-900">ダウンロード可</span>: 直接ダウンロード可能</div>
              <div>・<span className="font-bold text-gray-900">編集・削除可</span>: 画像の編集・削除が可能</div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-400 rounded-lg p-2 bg-white">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-2 p-2 hover:bg-blue-50 rounded border border-gray-300 bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 font-semibold block truncate">{user.name}</span>
                    <span className="text-xs text-gray-700 block truncate">{user.email}</span>
                  </div>
                  <select
                    value={userPermissions[user.id] || 'none'}
                    onChange={(e) => setUserPermissionLevel(user.id, e.target.value as 'view' | 'download' | 'edit' | 'none')}
                    className="text-sm border-2 border-gray-400 rounded px-2 py-1.5 bg-white text-gray-900 font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="none">権限なし</option>
                    <option value="view">閲覧のみ</option>
                    <option value="download">ダウンロード可</option>
                    <option value="edit">編集・削除可</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowPermissionModal(false); setSelectedImage(null); }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFolderPermissionModal && editingFolder && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              フォルダ権限設定: {editingFolder.name}
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              このフォルダ内のすべての画像にアクセス権限が付与されます。
            </p>
            <div className="text-xs text-gray-700 mb-4 space-y-1 bg-gray-100 p-3 rounded-lg border border-gray-300">
              <div>・<span className="font-bold text-gray-900">閲覧のみ</span>: 画像を見れるが申請が必要</div>
              <div>・<span className="font-bold text-gray-900">ダウンロード可</span>: 直接ダウンロード可能</div>
              <div>・<span className="font-bold text-gray-900">編集・削除可</span>: 画像の編集・削除が可能</div>
            </div>

            {/* デフォルト権限設定 */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                デフォルト権限（個別設定がない場合）
              </label>
              <select
                value={folderDefaultPermission}
                onChange={(e) => setFolderDefaultPermission(e.target.value as DefaultPermission)}
                className="w-full text-sm border-2 border-blue-300 rounded px-3 py-2 bg-white text-gray-900 font-semibold focus:border-blue-500 focus:outline-none"
              >
                <option value="none">なし（個別権限のみ）</option>
                <option value="view">全員が閲覧可能</option>
                <option value="download">全員がダウンロード可能</option>
                <option value="edit">全員が編集・削除可能</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                ※ 個別ユーザー権限が設定されている場合、そちらが優先されます
              </p>
            </div>

            <h3 className="text-sm font-bold text-gray-900 mb-2">ユーザー別権限</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-400 rounded-lg p-2 bg-white">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-2 p-2 hover:bg-blue-50 rounded border border-gray-300 bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 font-semibold block truncate">{user.name}</span>
                    <span className="text-xs text-gray-700 block truncate">{user.email}</span>
                  </div>
                  <select
                    value={userPermissions[user.id] || 'none'}
                    onChange={(e) => setUserPermissionLevel(user.id, e.target.value as 'view' | 'download' | 'edit' | 'none')}
                    className="text-sm border-2 border-gray-400 rounded px-2 py-1.5 bg-white text-gray-900 font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="none">権限なし</option>
                    <option value="view">閲覧のみ</option>
                    <option value="download">ダウンロード可</option>
                    <option value="edit">編集・削除可</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowFolderPermissionModal(false); setEditingFolder(null); }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveFolderPermissions}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移動先フォルダ選択モーダル */}
      {showMoveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              移動先を選択
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedFolderIds.size > 0 && `${selectedFolderIds.size}フォルダ`}
              {selectedFolderIds.size > 0 && selectedImageIds.size > 0 && ' + '}
              {selectedImageIds.size > 0 && `${selectedImageIds.size}画像`}
              を移動します
            </p>
            <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
              <button
                onClick={() => handleBulkMove(null)}
                className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-gray-100 ${
                  currentFolderId === null ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                }`}
                disabled={currentFolderId === null}
              >
                <span className="text-xl">🏠</span>
                <span className="text-sm text-gray-900">ルート</span>
                {currentFolderId === null && <span className="text-xs text-gray-400 ml-auto">現在地</span>}
              </button>
              {allFolders
                .filter(f => !selectedFolderIds.has(f.id))
                .map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleBulkMove(folder.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-gray-100 ${
                      currentFolderId === folder.id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                    }`}
                    disabled={currentFolderId === folder.id}
                  >
                    <span className="text-xl">📁</span>
                    <span className="text-sm text-gray-900">{folder.name}</span>
                    {currentFolderId === folder.id && <span className="text-xs text-gray-400 ml-auto">現在地</span>}
                  </button>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括権限設定モーダル */}
      {showBulkPermissionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              一括権限設定
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              {selectedFolderIds.size > 0 && `${selectedFolderIds.size}フォルダ`}
              {selectedFolderIds.size > 0 && selectedImageIds.size > 0 && ' + '}
              {selectedImageIds.size > 0 && `${selectedImageIds.size}画像`}
              に権限を設定します
            </p>
            <div className="text-xs text-gray-700 mb-4 space-y-1 bg-gray-100 p-3 rounded-lg border border-gray-300">
              <div>・<span className="font-bold text-gray-900">閲覧のみ</span>: 画像を見れるが申請が必要</div>
              <div>・<span className="font-bold text-gray-900">ダウンロード可</span>: 直接ダウンロード可能</div>
              <div>・<span className="font-bold text-gray-900">編集・削除可</span>: 画像の編集・削除が可能</div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-400 rounded-lg p-2 bg-white">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-2 p-2 hover:bg-blue-50 rounded border border-gray-300 bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 font-semibold block truncate">{user.name}</span>
                    <span className="text-xs text-gray-700 block truncate">{user.email}</span>
                  </div>
                  <select
                    value={userPermissions[user.id] || 'none'}
                    onChange={(e) => setUserPermissionLevel(user.id, e.target.value as 'view' | 'download' | 'edit' | 'none')}
                    className="text-sm border-2 border-gray-400 rounded px-2 py-1.5 bg-white text-gray-900 font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="none">権限なし</option>
                    <option value="view">閲覧のみ</option>
                    <option value="download">ダウンロード可</option>
                    <option value="edit">編集・削除可</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowBulkPermissionModal(false); setUserPermissions({}); }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleBulkPermission}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '権限を設定'}
              </button>
            </div>
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
            className="max-w-full max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo(previewImage) ? (
              <video
                src={getImageUrl(previewImage.storage_path)}
                controls
                autoPlay
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <img
                src={getImageUrl(previewImage.storage_path)}
                alt={previewImage.original_filename}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-white text-sm text-center">
                {previewImage.original_filename}
                <span className="text-gray-400 ml-2">({currentPreviewIndex + 1} / {sortedImages.length})</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPreviewImage(null);
                    openPermissionModal(previewImage);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  権限設定
                </button>
                <button
                  onClick={() => {
                    setPreviewImage(null);
                    handleDeleteImage(previewImage.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="削除"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
