import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type UserRoleType = 'client' | 'master' | 'business_manager' | 'network_manager' | 'business_owner' | 'network_owner' | 'platform_admin' | 'super_admin' | 'platform_manager';

interface Profile {
  id: string;
  skillspot_id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  platform_role: 'platform_admin' | 'user';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRoleType[];
  activeRole: UserRoleType;
  setActiveRole: (role: UserRoleType) => void;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, referredBy?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRoleType[]>([]);
  const [activeRole, setActiveRole] = useState<UserRoleType>('client');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile | null;
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching roles:', error);
      return ['client' as UserRoleType];
    }

    const userRoles = (data || []).map((r: any) => r.role as UserRoleType);
    return userRoles.length > 0 ? userRoles : ['client' as UserRoleType];
  };

  const refreshProfile = async () => {
    if (user) {
      const [profileData, userRoles] = await Promise.all([
        fetchProfile(user.id),
        fetchRoles(user.id),
      ]);
      setProfile(profileData);
      setRoles(userRoles);
      // Restore active role from localStorage or default to first role
      const savedRole = localStorage.getItem('skillspot_active_role') as UserRoleType;
      if (savedRole && userRoles.includes(savedRole)) {
        setActiveRole(savedRole);
      } else {
        setActiveRole(userRoles[0]);
      }
    }
  };

  const handleSetActiveRole = (role: UserRoleType) => {
    setActiveRole(role);
    localStorage.setItem('skillspot_active_role', role);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(async () => {
            const [profileData, userRoles] = await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchRoles(currentSession.user.id),
            ]);
            setProfile(profileData);
            setRoles(userRoles);
            const savedRole = localStorage.getItem('skillspot_active_role') as UserRoleType;
            if (savedRole && userRoles.includes(savedRole)) {
              setActiveRole(savedRole);
            } else {
              setActiveRole(userRoles[0]);
            }
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setActiveRole('client');
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!existingSession) {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, referredBy?: string) => {
    try {
      const metaData: Record<string, string | undefined> = {
        first_name: firstName,
        last_name: lastName,
      };
      if (referredBy) metaData.referred_by = referredBy;

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://skilldrill.lovable.app/dashboard',
          data: metaData,
        },
      });

      if (authError) {
        return { error: authError };
      }

      // Profile is auto-created by database trigger
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setActiveRole('client');
    localStorage.removeItem('skillspot_active_role');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        activeRole,
        setActiveRole: handleSetActiveRole,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
