import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { drainPendingSignupConsent } from '@/lib/drainPendingSignupConsent';

type AppRole = 'host' | 'shopper';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  identity_verified: boolean;
  identity_verified_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isVerified: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole, firstName?: string, lastName?: string, phoneNumber?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Sync Google profile data (name & avatar) if user signed in via Google
  const syncGoogleProfile = async (userId: string, userMetadata: Record<string, any>) => {
    if (!userMetadata) return;

    const googleName = userMetadata.full_name || userMetadata.name;
    const googleAvatar = userMetadata.avatar_url || userMetadata.picture;

    if (!googleName && !googleAvatar) return;

    try {
      // Fetch current profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();

      const updates: Record<string, string> = {};

      // Sync name if profile is empty
      if (googleName && !currentProfile?.full_name) {
        updates.full_name = googleName;
      }

      // Sync avatar if profile has none (smart avatar)
      if (googleAvatar && !currentProfile?.avatar_url) {
        updates.avatar_url = googleAvatar;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) {
          console.error('Error syncing Google profile:', error);
        } else {
          console.log('Google profile synced:', updates);
        }
      }
    } catch (error) {
      console.error('Error syncing Google profile:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }
      return data.map(r => r.role as AppRole);
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const [profileData, rolesData] = await Promise.all([
      fetchProfile(user.id),
      fetchRoles(user.id),
    ]);
    if (profileData) setProfile(profileData);
    setRoles(rolesData);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile/roles fetch to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            // Sync Google profile data on sign-in
            if (event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google') {
              await syncGoogleProfile(session.user.id, session.user.user_metadata);
            }

            // Notify on first sign-in for OAuth (Google) users — email/password
            // signups are handled inline in signUp(). Detected by created_at
            // being close to now and matching last_sign_in_at.
            if (event === 'SIGNED_IN' && session.user.app_metadata?.provider && session.user.app_metadata.provider !== 'email') {
              try {
                const createdAt = new Date(session.user.created_at).getTime();
                const lastSignIn = session.user.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : createdAt;
                const isNewUser = Math.abs(lastSignIn - createdAt) < 60_000 && Date.now() - createdAt < 5 * 60_000;
                const flagKey = `welcome_sent_${session.user.id}`;
                if (isNewUser && !window.localStorage.getItem(flagKey)) {
                  window.localStorage.setItem(flagKey, '1');
                  const meta = session.user.user_metadata || {};
                  const fullName = meta.full_name || meta.name || '';
                  const email = session.user.email || '';
                  supabase.functions.invoke('send-welcome-email', {
                    body: { email, fullName, role: 'shopper' },
                  }).catch(e => console.error('welcome email failed', e));
                }
              } catch (e) {
                console.warn('new-user notification check failed', e);
              }
            }


            // Stitch the anonymous analytics session to the now-known user so
            // pre-auth events can be back-attributed in admin queries.
            if (event === 'SIGNED_IN') {
              try {
                const sid = typeof window !== 'undefined'
                  ? window.sessionStorage?.getItem('analytics_session_id')
                  : null;
                if (sid) {
                  await (supabase.from('analytics_events') as any).insert({
                    user_id: session.user.id,
                    session_id: sid,
                    event_name: 'session_user_link',
                    event_category: 'attribution',
                    metadata: { session_id: sid, linked_user_id: session.user.id, provider: session.user.app_metadata?.provider ?? 'email' },
                    route: typeof window !== 'undefined' ? window.location.pathname : null,
                  });
                }
              } catch (e) {
                console.warn('[Analytics] session_user_link failed', e);
              }

              // Drain any session-deferred signup consent (Terms + Privacy)
              // captured before email verification. No-op if the stash is
              // empty or belongs to a different email.
              drainPendingSignupConsent(session.user).catch((e) =>
                console.warn('[Auth] deferred consent drain failed', e),
              );

              // Honor the pre-auth redirect intent stashed by OAuth /
              // Message-Seller / checkout entry points. Same-origin only.
              try {
                const pending = window.sessionStorage?.getItem('pending_post_auth_redirect');
                if (pending && pending.startsWith('/') && !pending.startsWith('//')) {
                  window.sessionStorage.removeItem('pending_post_auth_redirect');
                  const here = window.location.pathname + window.location.search;
                  if (here !== pending) {
                    // Defer so profile/roles state hydrates first.
                    setTimeout(() => window.location.assign(pending), 50);
                  }
                }
              } catch {
                /* ignore */
              }
            }




            const [profileData, rolesData] = await Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id),
            ]);
            if (profileData) setProfile(profileData);
            setRoles(rolesData);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );


    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Sync Google profile for existing sessions (e.g., after OAuth redirect)
        if (session.user.app_metadata?.provider === 'google') {
          await syncGoogleProfile(session.user.id, session.user.user_metadata);
        }

        // Drain deferred signup consent for cases where the verify redirect
        // rehydrates the session without emitting a fresh SIGNED_IN event.
        drainPendingSignupConsent(session.user).catch((e) =>
          console.warn('[Auth] deferred consent drain failed', e),
        );

        const [profileData, rolesData] = await Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
        ]);
        if (profileData) setProfile(profileData);
        setRoles(rolesData);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, firstName?: string, lastName?: string, phoneNumber?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            first_name: firstName || '',
            last_name: lastName || '',
            phone_number: phoneNumber || '',
            role, // consumed by handle_new_user trigger to seed user_roles
          },
        },
      });

      if (error) {
        return { error };
      }

      // Role is now assigned by the handle_new_user trigger (SECURITY DEFINER)
      // using the `role` field in user_metadata above. We still attempt a
      // best-effort client insert as belt-and-suspenders for legacy sessions,
      // but ON CONFLICT prevents duplicates and RLS failures are non-fatal.
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role });

        if (roleError && !/(duplicate|already exists|conflict)/i.test(roleError.message)) {
          // Trigger is the source of truth — log but don't fail signup.
          console.warn('[signUp] client user_roles insert skipped:', roleError.message);
        }

        // Send welcome email to the new user
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email,
              fullName,
              role,
            },
          });
        } catch (welcomeError) {
          console.error('Failed to send welcome email:', welcomeError);
        }

      }


      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const isVerified = profile?.identity_verified ?? false;

  // Track user activity for "last active" feature
  useActivityTracker(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isVerified,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
