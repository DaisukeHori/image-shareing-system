'use client';

import { useEffect, useState, useRef } from 'react';
import HelpTip from '@/components/HelpTip';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
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
}

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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null | 'root'>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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
    // 内部ドラッグ（画像移動）の場合はスキップ
    if (draggingImageId) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // 内部ドラッグ（画像移動）の場合はスキップ
    if (draggingImageId) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    // 内部ドラッグ（画像移動）の場合はスキップ
    if (draggingImageId) return;

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
          if (file && file.type.startsWith('image/')) {
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

    let entries = await readEntries();
    while (entries.length > 0) {
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await getFileFromEntry(entry as FileSystemFileEntry);
          if (file && file.type.startsWith('image/')) {
            results.push({ folderName, file });
          }
        }
      }
      entries = await readEntries();
    }

    return results;
  }

  async function uploadFiles(files: File[]) {
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) {
          formData.append('folder_id', currentFolderId);
        }

        const res = await fetch('/api/admin/images', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!data.success) {
          console.error(`${file.name}: ${data.error}`);
        }
      }
      fetchData();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }

  async function uploadFolderFiles(folderFiles: { folderName: string; file: File }[]) {
    const folderGroups = new Map<string, File[]>();
    for (const { folderName: fName, file } of folderFiles) {
      if (!folderGroups.has(fName)) {
        folderGroups.set(fName, []);
      }
      folderGroups.get(fName)!.push(file);
    }

    setUploading(true);
    const totalFiles = folderFiles.length;
    let uploadedCount = 0;
    setUploadProgress({ current: 0, total: totalFiles });

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
        }

        for (const file of files) {
          uploadedCount++;
          setUploadProgress({ current: uploadedCount, total: totalFiles });

          const formData = new FormData();
          formData.append('file', file);
          if (targetFolderId) {
            formData.append('folder_id', targetFolderId);
          }

          const res = await fetch('/api/admin/images', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (!data.success) {
            console.error(`${file.name}: ${data.error}`);
          }
        }
      }
      fetchData();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('アップロードに失敗しました');
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

    const folderFilesList: { folderName: string; file: File }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        folderFilesList.push({ folderName: fName, file });
      }
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

  async function handleDeleteFolder(id: string) {
    if (!confirm('このフォルダと中の画像をすべて削除しますか？')) return;

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
  }

  async function handleDeleteImage(id: string) {
    if (!confirm('この画像を削除しますか？')) return;

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
    setDraggingImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', imageId);
  }

  function handleImageDragEnd() {
    setDraggingImageId(null);
    setDropTargetFolderId(null);
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: string | null) {
    if (!draggingImageId) return;
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(folderId === null ? 'root' : folderId);
  }

  function handleFolderDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(null);
  }

  function handleFolderDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault();
    e.stopPropagation();
    if (draggingImageId) {
      handleMoveImage(draggingImageId, targetFolderId);
    }
    setDraggingImageId(null);
    setDropTargetFolderId(null);
  }

  function openPermissionModal(image: Image) {
    setSelectedImage(image);
    setSelectedUserIds(image.permissions?.map(p => p.user_id) || []);
    setShowPermissionModal(true);
  }

  function openFolderPermissionModal(folder: Folder) {
    setEditingFolder(folder);
    setSelectedUserIds([]);
    setShowFolderPermissionModal(true);
    fetch(`/api/admin/folders/${folder.id}/permissions`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSelectedUserIds(data.data.map((p: { user_id: string }) => p.user_id));
        }
      });
  }

  async function handleSavePermissions() {
    if (!selectedImage) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/images/${selectedImage.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedUserIds }),
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
      const res = await fetch(`/api/admin/folders/${editingFolder.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedUserIds }),
      });

      const data = await res.json();
      if (data.success) {
        setShowFolderPermissionModal(false);
        setEditingFolder(null);
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
          <HelpTip content="フォルダと画像を管理します。ドラッグ＆ドロップでアップロードできます。" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setEditingFolder(null); setFolderName(''); setShowFolderModal(true); }}
            className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
          >
            📁 新規フォルダ
          </button>
          <label className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm">
            {uploading ? `${uploadProgress.current}/${uploadProgress.total}` : '📷 画像追加'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <label className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer text-sm">
            📂 フォルダごと
            <input
              ref={folderInputRef}
              type="file"
              accept="image/*"
              /* @ts-expect-error webkitdirectory is not in types */
              webkitdirectory="true"
              onChange={handleFolderUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
          >
            {viewMode === 'grid' ? '📋 リスト' : '📊 グリッド'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm overflow-x-auto pb-2">
        <button
          onClick={() => setCurrentFolderId(null)}
          onDragOver={(e) => handleFolderDragOver(e, null)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, null)}
          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 whitespace-nowrap transition-all ${
            !currentFolderId ? 'font-bold text-blue-600' : 'text-gray-600'
          } ${dropTargetFolderId === 'root' ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
        >
          🏠 ルート
        </button>
        {breadcrumbs.map((folder, index) => (
          <span key={folder.id} className="flex items-center gap-2">
            <span className="text-gray-400">/</span>
            <button
              onClick={() => setCurrentFolderId(folder.id)}
              onDragOver={(e) => handleFolderDragOver(e, folder.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, folder.id)}
              className={`px-2 py-1 rounded hover:bg-gray-100 whitespace-nowrap transition-all ${
                index === breadcrumbs.length - 1 ? 'font-bold text-blue-600' : 'text-gray-600'
              } ${dropTargetFolderId === folder.id ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
            >
              📁 {folder.name}
            </button>
          </span>
        ))}
      </div>

      {currentFolderId && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-gray-600">
            📁 {breadcrumbs[breadcrumbs.length - 1]?.name}
          </span>
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

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {folders.map((folder) => (
            <div
              key={`folder-${folder.id}`}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer group ${
                dropTargetFolderId === folder.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onDragOver={(e) => handleFolderDragOver(e, folder.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, folder.id)}
            >
              <div
                onClick={() => setCurrentFolderId(folder.id)}
                className="p-4 text-center"
              >
                <div className="text-5xl mb-2">{dropTargetFolderId === folder.id ? '📂' : '📁'}</div>
                <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
              </div>
              <div className="px-2 pb-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  削除
                </button>
              </div>
            </div>
          ))}

          {images.map((image) => (
            <div
              key={`image-${image.id}`}
              draggable
              onDragStart={(e) => handleImageDragStart(e, image.id)}
              onDragEnd={handleImageDragEnd}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing ${
                draggingImageId === image.id ? 'opacity-50 ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                <img
                  src={getImageUrl(image.storage_path)}
                  alt={image.original_filename}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-900 truncate" title={image.original_filename}>
                  {image.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {image.permissions?.length || 0}人に許可
                </p>
              </div>
              <div className="px-2 pb-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openPermissionModal(image)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  権限
                </button>
                <button
                  onClick={() => handleDeleteImage(image.id)}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  削除
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
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                  className={`hover:bg-gray-50 cursor-pointer transition-all ${
                    dropTargetFolderId === folder.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''
                  }`}
                  onClick={() => setCurrentFolderId(folder.id)}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{dropTargetFolderId === folder.id ? '📂' : '📁'}</span>
                      <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">フォルダ</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">-</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderName(folder.name); setShowFolderModal(true); }}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                    >
                      編集
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
              {images.map((image) => (
                <tr
                  key={`image-${image.id}`}
                  draggable
                  onDragStart={(e) => handleImageDragStart(e, image.id)}
                  onDragEnd={handleImageDragEnd}
                  className={`hover:bg-gray-50 cursor-grab active:cursor-grabbing ${
                    draggingImageId === image.id ? 'opacity-50 bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={getImageUrl(image.storage_path)}
                        alt=""
                        className="w-8 h-8 object-cover rounded pointer-events-none"
                      />
                      <span className="text-sm text-gray-900 truncate max-w-[150px] sm:max-w-none">
                        {image.original_filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">画像</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {image.permissions?.length || 0}人
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openPermissionModal(image)}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-2"
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
                  <td colSpan={4} className="px-4 py-16 text-center text-gray-500">
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
            <p className="text-sm text-gray-500 mb-4">{selectedImage.original_filename}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer select-none"
                  onClick={() => {
                    setSelectedUserIds(prev =>
                      prev.includes(user.id)
                        ? prev.filter(id => id !== user.id)
                        : [...prev, user.id]
                    );
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    readOnly
                    className="w-5 h-5 pointer-events-none accent-blue-600"
                  />
                  <span className="text-sm text-gray-900">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
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
            <p className="text-sm text-gray-500 mb-4">
              このフォルダ内のすべての画像にアクセス権限が付与されます。
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer select-none"
                  onClick={() => {
                    setSelectedUserIds(prev =>
                      prev.includes(user.id)
                        ? prev.filter(id => id !== user.id)
                        : [...prev, user.id]
                    );
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    readOnly
                    className="w-5 h-5 pointer-events-none accent-blue-600"
                  />
                  <span className="text-sm text-gray-900">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
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
    </div>
  );
}
