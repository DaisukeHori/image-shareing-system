'use client';

import { useEffect, useState, useRef } from 'react';

interface Department {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  department_id: string | null;
  department: Department | null;
  role: 'admin' | 'user';
  is_ceo: boolean;
  is_active: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    department_id: '',
    role: 'user' as 'admin' | 'user',
    is_ceo: false,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [usersRes, deptRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/departments'),
      ]);

      const usersData = await usersRes.json();
      const deptData = await deptRes.json();

      if (usersData.success) setUsers(usersData.data);
      if (deptData.success) setDepartments(deptData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(user?: User) {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        department_id: user.department_id || '',
        role: user.role,
        is_ceo: user.is_ceo,
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        department_id: '',
        role: 'user',
        is_ceo: false,
        is_active: true,
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';

      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
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

  async function handleDelete(id: string) {
    if (!confirm('このユーザーを削除しますか？')) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
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

  async function handleExport() {
    window.location.href = '/api/admin/users/csv';
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/users/csv', {
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ユーザー管理</h1>
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
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
        CSVフォーマット: メールアドレス,名前,所属名,権限(admin/user),社長(はい/いいえ),有効(はい/いいえ)
      </div>

      {/* モバイル用カードビュー */}
      <div className="sm:hidden space-y-3">
        {users.map((user) => (
          <div key={user.id} className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium text-gray-900">{user.name}</span>
                {user.is_ceo && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                    社長
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.role === 'admin' ? '管理者' : '一般'}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    user.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.is_active ? '有効' : '無効'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
            <p className="text-sm text-gray-500">{user.department?.name || '未所属'}</p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => openModal(user)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                編集
              </button>
              <button
                onClick={() => handleDelete(user.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                削除
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            ユーザーが登録されていません
          </div>
        )}
      </div>

      {/* デスクトップ用テーブルビュー */}
      <div className="hidden sm:block bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                名前
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メール
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                権限
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {user.name}
                    </span>
                    {user.is_ceo && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                        社長
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="truncate block max-w-[150px] lg:max-w-none">{user.email}</span>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.department?.name || '未所属'}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role === 'admin' ? '管理者' : '一般'}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => openModal(user)}
                    className="text-blue-600 hover:text-blue-800 mr-2 lg:mr-4"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  ユーザーが登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              {editingUser ? 'ユーザーを編集' : '新規ユーザー'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名前 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス (Azure AD) *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所属
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) =>
                      setFormData({ ...formData, department_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">未所属</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    権限
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'admin' | 'user',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">一般</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_ceo}
                      onChange={(e) =>
                        setFormData({ ...formData, is_ceo: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">社長</span>
                  </label>
                  {editingUser && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">有効</span>
                    </label>
                  )}
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
    </div>
  );
}
