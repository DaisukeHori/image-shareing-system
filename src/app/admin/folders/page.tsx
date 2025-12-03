'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import HelpTip from '@/components/HelpTip';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  children?: Folder[];
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [flatFolders, setFlatFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [formData, setFormData] = useState({ name: '', parent_id: '' });
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchFolders();
  }, []);

  async function fetchFolders() {
    try {
      const res = await fetch('/api/admin/folders');
      const data = await res.json();
      if (data.success) {
        setFolders(data.data);
        setFlatFolders(data.flat);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(folder?: Folder) {
    if (folder) {
      setEditingFolder(folder);
      setFormData({
        name: folder.name,
        parent_id: folder.parent_id || '',
      });
    } else {
      setEditingFolder(null);
      setFormData({ name: '', parent_id: '' });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingFolder
        ? `/api/admin/folders/${editingFolder.id}`
        : '/api/admin/folders';

      const res = await fetch(url, {
        method: editingFolder ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchFolders();
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      isOpen: true,
      title: 'フォルダの削除',
      message: 'このフォルダを削除しますか？',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/folders/${id}`, {
            method: 'DELETE',
          });

          const data = await res.json();
          if (data.success) {
            fetchFolders();
          } else {
            alert(data.error || 'エラーが発生しました');
          }
        } catch (error) {
          console.error('Failed to delete:', error);
          alert('削除に失敗しました');
        }
      },
    });
  }

  function renderFolderTree(items: Folder[], level = 0) {
    return items.map((folder) => (
      <div key={folder.id}>
        <div
          className={`flex items-center justify-between py-2 px-4 hover:bg-gray-50 ${
            level > 0 ? 'border-l-2 border-gray-200' : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-sm text-gray-900">{folder.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal(folder)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              編集
            </button>
            <button
              onClick={() => handleDelete(folder.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              削除
            </button>
          </div>
        </div>
        {folder.children &&
          folder.children.length > 0 &&
          renderFolderTree(folder.children, level + 1)}
      </div>
    ));
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">フォルダ管理</h1>
            <HelpTip
              title="フォルダとは？"
              content="画像を整理するためのフォルダです。フォルダごとにアクセス権限を設定できます。親フォルダを指定すると、階層構造を作成できます。"
              highlight
            />
          </div>
          <p className="text-sm text-gray-500">画像を整理するフォルダを管理します</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新規作成
        </button>
      </div>

      {/* フォルダリスト */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {folders.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {renderFolderTree(folders)}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-amber-100 rounded-2xl rotate-6" />
              <div className="relative w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-4xl">📁</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">フォルダがありません</h3>
            <p className="text-sm text-gray-500 mb-6">
              最初のフォルダを作成して画像を整理しましょう
            </p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              フォルダを作成
            </button>
          </div>
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFolder ? 'フォルダを編集' : '新規フォルダ'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    フォルダ名 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                    親フォルダ
                    <HelpTip
                      content="このフォルダを入れる親フォルダを選択します。ルートに作成する場合は「ルート（なし）」を選択してください。"
                      size="sm"
                    />
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">ルート（なし）</option>
                    {flatFolders
                      .filter((f) => f.id !== editingFolder?.id)
                      .map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
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
