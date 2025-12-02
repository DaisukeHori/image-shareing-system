import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import type { NextAuthConfig } from 'next-auth';
import { createServiceClient } from './supabase/server';

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      try {
        const supabase = createServiceClient();

        // ユーザーがDBに存在するか確認
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('id, is_active')
          .eq('email', user.email.toLowerCase())
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching user:', fetchError);
          return false;
        }

        // ユーザーが存在しない場合はログイン拒否
        // （管理者がユーザーを事前登録する必要がある）
        if (!existingUser) {
          console.log(`User not registered: ${user.email}`);
          return '/auth/error?error=NotRegistered';
        }

        // ユーザーが無効化されている場合
        if (!existingUser.is_active) {
          console.log(`User is inactive: ${user.email}`);
          return '/auth/error?error=Inactive';
        }

        // Azure AD IDを更新
        if (account?.providerAccountId) {
          await supabase
            .from('users')
            .update({ azure_ad_id: account.providerAccountId })
            .eq('id', existingUser.id);
        }

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      // 初回サインイン時にAzure AD情報を保存
      if (user && account) {
        token.email = user.email;
        token.azureAdId = account.providerAccountId;
      }

      // 毎回DBからユーザー情報を取得（role変更を即反映）
      if (token.email) {
        try {
          const supabase = createServiceClient();

          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id, email, name, role, is_ceo, department_id')
            .eq('email', (token.email as string).toLowerCase())
            .single();

          if (dbUser && !error) {
            token.userId = dbUser.id;
            token.name = dbUser.name;
            token.role = dbUser.role;
            token.isCeo = dbUser.is_ceo;
            token.departmentId = dbUser.department_id;

            // 部署情報を別途取得
            if (dbUser.department_id) {
              const { data: dept } = await supabase
                .from('departments')
                .select('id, name, manager_user_id')
                .eq('id', dbUser.department_id)
                .single();

              if (dept) {
                token.department = dept;
              }
            } else {
              token.department = null;
            }
          }
        } catch (error) {
          console.error('JWT callback error:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // トークンからセッションにユーザー情報をコピー
      if (token) {
        session.user = {
          ...session.user,
          id: token.userId as string,
          email: token.email as string,
          name: token.name as string,
          role: (token.role as 'admin' | 'user') || 'user',
          isCeo: (token.isCeo as boolean) || false,
          departmentId: (token.departmentId as string) || null,
          department: (token.department as { id: string; name: string; manager_user_id: string | null }) || null,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8時間
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
