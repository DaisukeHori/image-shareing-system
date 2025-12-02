// データベーステーブルの型定義

export type UserRole = 'admin' | 'user';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'downloaded';

export interface Department {
  id: string;
  name: string;
  manager_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  department_id: string | null;
  role: UserRole;
  is_ceo: boolean;
  is_active: boolean;
  azure_ad_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithDepartment extends User {
  department: Department | null;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[];
}

export interface Image {
  id: string;
  folder_id: string | null;
  filename: string;
  original_filename: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
}

export interface ImagePermission {
  id: string;
  image_id: string;
  user_id: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  request_number: string;
  user_id: string;
  image_id: string;
  purpose: string;
  status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  downloaded_at: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  user: User;
  image: Image;
  approver?: User;
}

export interface ApprovalToken {
  id: string;
  request_id: string;
  approver_id: string;
  token: string;
  action: 'approve' | 'reject';
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface DownloadToken {
  id: string;
  request_id: string;
  token: string;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  updated_at: string;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 電子透かし情報
export interface WatermarkInfo {
  downloaderName: string;
  approverName: string;
  requestId: string;
  downloadDate: string;
}
