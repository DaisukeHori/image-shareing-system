'use client';

import { useEffect, useState, useRef } from 'react';
import HelpTip from '@/components/HelpTip';
import ConfirmModal from '@/components/ConfirmModal';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
  manager_user_id: string | null;
  manager: User | null;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', manager_user_id: '' });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [deptRes, usersRes] = await Promise.all([
        fetch('/api/admin/departments'),
        fetch('/api/admin/users'),
      ]);

      const deptData = await deptRes.json();
      const usersData = await usersRes.json();

      if (deptData.success) setDepartments(deptData.data);
      if (usersData.success) setUsers(usersData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(department?: Department) {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name,
        manager_user_id: department.manager_user_id || '',
      });
    } else {
      setEditingDepartment(null);
      setFormData({ name: '', manager_user_id: '' });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingDepartment
        ? `/api/admin/departments/${editingDepartment.id}`
        : '/api/admin/departments';

      const res = await fetch(url, {
        method: editingDepartment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchData();
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
      title: '所属の削除',
      message: 'この所属を削除しますか？',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/departments/${id}`, {
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
      },
    });
  }

  async function handleExport() {
    window.location.href = '/api/admin/departments/csv';
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/departments/csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setImportResult(data.results);
        fetchData();
      } else {
        alert(data.error || 'インポートに失敗しました');
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('インポートに失敗しました');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">所属管理</h1>
          <HelpTip content="ユーザーの所属部署を管理します。所属長を設定すると、その所属のユーザーからの申請を承認できます。" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            CSVエクスポート
          </button>
          <label className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm">
            {importing ? 'インポート中...' : 'CSVインポート'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
          <button
            onClick={() => openModal()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            新規作成
          </button>
        </div>
      </div>

      {/* インポート結果 */}
      {importResult && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-green-600">作成: {importResult.created}件</span>
            <span className="text-blue-600">更新: {importResult.updated}件</span>
            {importResult.errors.length > 0 && (
              <span className="text-red-600">エラー: {importResult.errors.length}件</span>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {importResult.errors.slice(0, 5).map((err, i) => (
                <div key={i}>{err}</div>
              ))}
              {importResult.errors.length > 5 && (
                <div>... 他 {importResult.errors.length - 5}件</div>
              )}
            </div>
          )}
          <button
            onClick={() => setImportResult(null)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            閉じる
          </button>
        </div>
      )}

      {/* CSVフォーマット説明 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-center gap-2">
        <span>CSVフォーマット: 所属名,所属長メールアドレス</span>
        <HelpTip content="同じ所属名がある場合は所属長のみ更新されます。所属長はユーザーとして先に登録されている必要があります。" />
      </div>

      {/* モバイル用カードビュー */}
      <div className="sm:hidden space-y-3">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900">{dept.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  所属長: {dept.manager?.name || '未設定'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => openModal(dept)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                編集
              </button>
              <button
                onClick={() => handleDelete(dept.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                削除
              </button>
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            所属が登録されていません
          </div>
        )}
      </div>

      {/* デスクトップ用テーブルビュー */}
      <div className="hidden sm:block bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属名
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属長
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {dept.name}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dept.manager?.name || '未設定'}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => openModal(dept)}
                    className="text-blue-600 hover:text-blue-800 mr-2 sm:mr-4"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  所属が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              {editingDepartment ? '所属を編集' : '新規所属'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所属名 *
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所属長
                  </label>
                  <select
                    value={formData.manager_user_id}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_user_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">未設定</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
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
