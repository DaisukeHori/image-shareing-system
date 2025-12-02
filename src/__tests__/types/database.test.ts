import {
  UserRole,
  ApprovalStatus,
  User,
  Department,
  Folder,
  Image,
  ApprovalRequest,
  ApiResponse,
} from '@/types/database';

describe('Database Types', () => {
  describe('UserRole', () => {
    it('should accept valid roles', () => {
      const admin: UserRole = 'admin';
      const user: UserRole = 'user';

      expect(admin).toBe('admin');
      expect(user).toBe('user');
    });
  });

  describe('ApprovalStatus', () => {
    it('should accept all valid statuses', () => {
      const statuses: ApprovalStatus[] = [
        'pending',
        'approved',
        'rejected',
        'expired',
        'downloaded',
      ];

      expect(statuses).toHaveLength(5);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('expired');
      expect(statuses).toContain('downloaded');
    });
  });

  describe('User', () => {
    it('should have correct structure', () => {
      const user: User = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'テストユーザー',
        department_id: 'dept-id',
        role: 'user',
        is_ceo: false,
        is_active: true,
        azure_ad_id: 'azure-id',
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(user.id).toBe('test-id');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
      expect(user.is_ceo).toBe(false);
    });

    it('should allow null department_id', () => {
      const user: User = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'テストユーザー',
        department_id: null,
        role: 'admin',
        is_ceo: true,
        is_active: true,
        azure_ad_id: null,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(user.department_id).toBeNull();
      expect(user.azure_ad_id).toBeNull();
    });
  });

  describe('Department', () => {
    it('should have correct structure', () => {
      const department: Department = {
        id: 'dept-id',
        name: '営業部',
        manager_user_id: 'manager-id',
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(department.name).toBe('営業部');
      expect(department.manager_user_id).toBe('manager-id');
    });

    it('should allow null manager', () => {
      const department: Department = {
        id: 'dept-id',
        name: '新規部署',
        manager_user_id: null,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(department.manager_user_id).toBeNull();
    });
  });

  describe('Folder', () => {
    it('should support nested structure', () => {
      const rootFolder: Folder = {
        id: 'root-id',
        name: 'ルートフォルダ',
        parent_id: null,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      const childFolder: Folder = {
        id: 'child-id',
        name: '子フォルダ',
        parent_id: 'root-id',
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(rootFolder.parent_id).toBeNull();
      expect(childFolder.parent_id).toBe('root-id');
    });
  });

  describe('Image', () => {
    it('should have correct structure', () => {
      const image: Image = {
        id: 'img-id',
        folder_id: 'folder-id',
        filename: 'abc123.jpg',
        original_filename: 'photo.jpg',
        storage_path: 'images/abc123.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        file_type: 'image',
        duration: null,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(image.filename).toBe('abc123.jpg');
      expect(image.original_filename).toBe('photo.jpg');
      expect(image.mime_type).toBe('image/jpeg');
      expect(image.file_type).toBe('image');
    });

    it('should support video files', () => {
      const video: Image = {
        id: 'vid-id',
        folder_id: 'folder-id',
        filename: 'video123.mp4',
        original_filename: 'sample.mp4',
        storage_path: 'videos/video123.mp4',
        file_size: 50000000,
        mime_type: 'video/mp4',
        width: 1920,
        height: 1080,
        file_type: 'video',
        duration: 120,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(video.file_type).toBe('video');
      expect(video.duration).toBe(120);
    });
  });

  describe('ApprovalRequest', () => {
    it('should track approval workflow', () => {
      const request: ApprovalRequest = {
        id: 'req-id',
        request_number: 'REQ-20241202-0001',
        user_id: 'user-id',
        image_id: 'img-id',
        purpose: 'SNS投稿用',
        purpose_type: 'sns',
        purpose_other: null,
        usage_end_date: '2025-06-02',
        agreed_to_terms: true,
        requester_comment: '急ぎでお願いします',
        approver_comment: null,
        status: 'pending',
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        expires_at: null,
        downloaded_at: null,
        download_count: 0,
        deletion_confirmed_user: false,
        deletion_confirmed_user_at: null,
        deletion_confirmed_approver: false,
        deletion_confirmed_approver_at: null,
        deletion_reminder_sent_at: null,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      };

      expect(request.status).toBe('pending');
      expect(request.download_count).toBe(0);
      expect(request.purpose_type).toBe('sns');
      expect(request.agreed_to_terms).toBe(true);
    });

    it('should update on approval', () => {
      const request: ApprovalRequest = {
        id: 'req-id',
        request_number: 'REQ-20241202-0001',
        user_id: 'user-id',
        image_id: 'img-id',
        purpose: 'SNS投稿用',
        purpose_type: 'sns',
        purpose_other: null,
        usage_end_date: '2025-06-02',
        agreed_to_terms: true,
        requester_comment: null,
        approver_comment: '承認しました。利用規約を守ってください。',
        status: 'approved',
        approved_by: 'approver-id',
        approved_at: '2024-12-02T10:00:00Z',
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        expires_at: '2024-12-09T10:00:00Z',
        downloaded_at: null,
        download_count: 0,
        deletion_confirmed_user: false,
        deletion_confirmed_user_at: null,
        deletion_confirmed_approver: false,
        deletion_confirmed_approver_at: null,
        deletion_reminder_sent_at: null,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T10:00:00Z',
      };

      expect(request.status).toBe('approved');
      expect(request.approved_by).toBe('approver-id');
      expect(request.expires_at).not.toBeNull();
    });

    it('should track download', () => {
      const request: ApprovalRequest = {
        id: 'req-id',
        request_number: 'REQ-20241202-0001',
        user_id: 'user-id',
        image_id: 'img-id',
        purpose: 'SNS投稿用',
        purpose_type: 'sns',
        purpose_other: null,
        usage_end_date: '2025-06-02',
        agreed_to_terms: true,
        requester_comment: null,
        approver_comment: null,
        status: 'downloaded',
        approved_by: 'approver-id',
        approved_at: '2024-12-02T10:00:00Z',
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        expires_at: '2024-12-09T10:00:00Z',
        downloaded_at: '2024-12-02T11:00:00Z',
        download_count: 1,
        deletion_confirmed_user: false,
        deletion_confirmed_user_at: null,
        deletion_confirmed_approver: false,
        deletion_confirmed_approver_at: null,
        deletion_reminder_sent_at: null,
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-12-02T11:00:00Z',
      };

      expect(request.status).toBe('downloaded');
      expect(request.download_count).toBe(1);
      expect(request.downloaded_at).not.toBeNull();
    });

    it('should track deletion confirmation', () => {
      const request: ApprovalRequest = {
        id: 'req-id',
        request_number: 'REQ-20241202-0001',
        user_id: 'user-id',
        image_id: 'img-id',
        purpose: 'その他: テスト利用',
        purpose_type: 'other',
        purpose_other: 'テスト利用',
        usage_end_date: '2024-11-01',
        agreed_to_terms: true,
        requester_comment: 'テスト用に使います',
        approver_comment: 'テスト利用を承認しました',
        status: 'downloaded',
        approved_by: 'approver-id',
        approved_at: '2024-12-02T10:00:00Z',
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        expires_at: '2024-12-09T10:00:00Z',
        downloaded_at: '2024-12-02T11:00:00Z',
        download_count: 1,
        deletion_confirmed_user: true,
        deletion_confirmed_user_at: '2024-11-02T10:00:00Z',
        deletion_confirmed_approver: true,
        deletion_confirmed_approver_at: '2024-11-02T11:00:00Z',
        deletion_reminder_sent_at: '2024-11-02T05:00:00Z',
        created_at: '2024-12-02T00:00:00Z',
        updated_at: '2024-11-02T11:00:00Z',
      };

      expect(request.deletion_confirmed_user).toBe(true);
      expect(request.deletion_confirmed_approver).toBe(true);
      expect(request.purpose_type).toBe('other');
      expect(request.purpose_other).toBe('テスト利用');
    });
  });

  describe('ApiResponse', () => {
    it('should handle success response', () => {
      const response: ApiResponse<User[]> = {
        success: true,
        data: [],
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });

    it('should handle error response', () => {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Unauthorized',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unauthorized');
    });
  });
});
