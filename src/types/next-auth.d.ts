import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'user';
      isCeo: boolean;
      departmentId: string | null;
      department: {
        id: string;
        name: string;
        manager_user_id: string | null;
      } | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role?: 'admin' | 'user';
    isCeo?: boolean;
    departmentId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId?: string;
    role?: 'admin' | 'user';
    isCeo?: boolean;
    departmentId?: string | null;
    azureAdId?: string;
    department?: {
      id: string;
      name: string;
      manager_user_id: string | null;
    } | null;
  }
}
