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
      if (user && account) {
        token.email = user.email;
        token.azureAdId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) {
        try {
          const supabase = createServiceClient();

          // DBからユーザー情報を取得
          const { data: dbUser } = await supabase
            .from('users')
            .select(`
              id,
              email,
              name,
              role,
              is_ceo,
              department_id,
              departments (
                id,
                name,
                manager_user_id
              )
            `)
            .eq('email', (token.email as string).toLowerCase())
            .single();

          if (dbUser) {
            session.user = {
              ...session.user,
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              isCeo: dbUser.is_ceo,
              departmentId: dbUser.department_id,
              department: dbUser.departments,
            };
          }
        } catch (error) {
          console.error('Session callback error:', error);
        }
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
