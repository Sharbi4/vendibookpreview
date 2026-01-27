import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityTracker } from '@/hooks/useActivityTracker';

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
          },
        },
      });

      if (error) {
        return { error };
      }

      // Add the selected role
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role });

        if (roleError) {
          console.error('Error adding role:', roleError);
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
          console.log('Welcome email sent successfully');
        } catch (welcomeError) {
          console.error('Failed to send welcome email:', welcomeError);
        }

        // Send admin notification for new user signup
        try {
          await supabase.functions.invoke('send-admin-notification', {
            body: {
              type: 'new_user',
              data: {
                email,
                full_name: fullName,
                role,
                user_id: data.user.id,
              },
            },
          });
        } catch (notifyError) {
          console.error('Failed to send admin notification:', notifyError);
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
  useActivityTracker();

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
