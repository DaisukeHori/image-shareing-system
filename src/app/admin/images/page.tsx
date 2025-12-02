'use client';

import { useEffect, useState, useRef } from 'react';

interface Folder {
  id: string;
  name: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showFolderPermissionModal, setShowFolderPermissionModal] = useState(false);
  const [selectedFolderForPermission, setSelectedFolderForPermission] = useState<Folder | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [selectedFolder]);

  async function fetchData() {
    try {
      const url = selectedFolder
        ? `/api/admin/images?folder_id=${selectedFolder}`
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
      if (foldersData.success) setFolders(foldersData.flat);
      if (usersData.success) setUsers(usersData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        const formData = new FormData();
        formData.append('file', file);
        if (selectedFolder) {
          formData.append('folder_id', selectedFolder);
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleFolderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // フォルダ名を取得
    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    const folderName = pathParts[0];

    // フォルダを作成または取得
    let targetFolderId = selectedFolder;

    try {
      // 新しいフォルダを作成
      const folderRes = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          parent_id: selectedFolder || null,
        }),
      });

      const folderData = await folderRes.json();
      if (folderData.success) {
        targetFolderId = folderData.data.id;
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 画像ファイルのみ処理
        if (!file.type.startsWith('image/')) continue;

        setUploadProgress({ current: i + 1, total: files.length });

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
      fetchData();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この画像を削除しますか？')) return;

    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('削除に失敗しました');
    }
  }

  async function handleBulkDelete() {
    if (selectedImages.length === 0) return;
    if (!confirm(`選択した${selectedImages.length}件の画像を削除しますか？`)) return;

    try {
      for (const id of selectedImages) {
        await fetch(`/api/admin/images/${id}`, { method: 'DELETE' });
      }
      setSelectedImages([]);
      setIsMultiSelectMode(false);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('削除に失敗しました');
    }
  }

  async function openPermissionModal(image: Image) {
    try {
      const res = await fetch(`/api/admin/images/${image.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedImage(data.data);
        setSelectedUserIds(
          data.data.permissions?.map((p: Permission) => p.user_id) || []
        );
        setShowPermissionModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch image details:', error);
    }
  }

  async function openBulkPermissionModal() {
    if (selectedImages.length === 0) return;
    setSelectedUserIds([]);
    setShowPermissionModal(true);
  }

  async function openFolderPermissionModal(folder: Folder) {
    try {
      const res = await fetch(`/api/admin/folders/${folder.id}/permissions`);
      const data = await res.json();
      if (data.success) {
        setSelectedFolderForPermission(folder);
        setSelectedUserIds(
          data.data?.map((p: { user_id: string }) => p.user_id) || []
        );
        setShowFolderPermissionModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch folder permissions:', error);
    }
  }

  async function handleSavePermissions() {
    setSaving(true);

    try {
      if (selectedImages.length > 0) {
        // 複数画像の権限設定
        for (const imageId of selectedImages) {
          await fetch(`/api/admin/images/${imageId}/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_ids: selectedUserIds }),
          });
        }
        setSelectedImages([]);
        setIsMultiSelectMode(false);
      } else if (selectedImage) {
        // 単一画像の権限設定
        const res = await fetch(
          `/api/admin/images/${selectedImage.id}/permissions`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_ids: selectedUserIds }),
          }
        );

        const data = await res.json();
        if (!data.success) {
          alert(data.error || 'エラーが発生しました');
          return;
        }
      }

      setShowPermissionModal(false);
      setSelectedImage(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFolderPermissions() {
    if (!selectedFolderForPermission) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/admin/folders/${selectedFolderForPermission.id}/permissions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: selectedUserIds }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setShowFolderPermissionModal(false);
        setSelectedFolderForPermission(null);
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Failed to save folder permissions:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function toggleImageSelection(imageId: string) {
    setSelectedImages((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId]
    );
  }

  function selectAllImages() {
    if (selectedImages.length === images.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images.map((img) => img.id));
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
    <div>
      {/* ヘッダー部分 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">画像管理</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">すべてのフォルダ</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <label className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm text-center">
              {uploading ? `${uploadProgress.current}/${uploadProgress.total}` : '画像'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <label className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm text-center">
              {uploading ? '...' : 'フォルダ'}
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
          </div>
        </div>
      </div>

      {/* フォルダ権限設定ボタン */}
      {selectedFolder && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm text-gray-600">
            フォルダ: {folders.find((f) => f.id === selectedFolder)?.name}
          </span>
          <button
            onClick={() => {
              const folder = folders.find((f) => f.id === selectedFolder);
              if (folder) openFolderPermissionModal(folder);
            }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            フォルダ権限設定
          </button>
        </div>
      )}

      {/* 複数選択モード */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          onClick={() => {
            setIsMultiSelectMode(!isMultiSelectMode);
            setSelectedImages([]);
          }}
          className={`px-3 py-1.5 rounded text-sm ${
            isMultiSelectMode
              ? 'bg-gray-800 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isMultiSelectMode ? '選択モード解除' : '複数選択'}
        </button>

        {isMultiSelectMode && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={selectAllImages}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              {selectedImages.length === images.length ? '全解除' : '全選択'}
            </button>
            <button
              onClick={openBulkPermissionModal}
              disabled={selectedImages.length === 0}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              権限設定 ({selectedImages.length})
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedImages.length === 0}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              削除 ({selectedImages.length})
            </button>
          </div>
        )}
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`bg-white rounded-lg shadow overflow-hidden group relative ${
                isMultiSelectMode && selectedImages.includes(image.id)
                  ? 'ring-2 ring-blue-500'
                  : ''
              }`}
              onClick={() => isMultiSelectMode && toggleImageSelection(image.id)}
            >
              {isMultiSelectMode && (
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(image.id)}
                    onChange={() => toggleImageSelection(image.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="aspect-square bg-gray-100 relative">
                <img
                  src={getImageUrl(image.storage_path)}
                  alt={image.original_filename}
                  className="w-full h-full object-cover"
                />
                {!isMultiSelectMode && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => openPermissionModal(image)}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-gray-900 rounded text-xs sm:text-sm font-medium hover:bg-gray-100"
                    >
                      権限
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-red-700"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
              <div className="p-2 sm:p-3">
                <p className="text-xs sm:text-sm text-gray-900 truncate">
                  {image.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {image.folder?.name || 'ルート'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          画像がありません
        </div>
      )}

      {/* 権限設定モーダル */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              アクセス権限設定
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedImages.length > 0
                ? `${selectedImages.length}件の画像に適用`
                : selectedImage?.original_filename}
            </p>
            <div className="space-y-2 max-h-60 sm:max-h-96 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="text-sm text-gray-500">
                {selectedUserIds.length}名を選択中
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false);
                    setSelectedImage(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フォルダ権限設定モーダル */}
      {showFolderPermissionModal && selectedFolderForPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              フォルダ権限設定
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              フォルダ: {selectedFolderForPermission.name}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              このフォルダ内のすべての画像に自動的にアクセス権限が付与されます
            </p>
            <div className="space-y-2 max-h-60 sm:max-h-96 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="text-sm text-gray-500">
                {selectedUserIds.length}名を選択中
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowFolderPermissionModal(false);
                    setSelectedFolderForPermission(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveFolderPermissions}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
