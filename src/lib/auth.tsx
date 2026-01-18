import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  restaurant_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  loading: boolean;
  isSuspended: boolean;
  suspendedReason: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; suspended?: boolean; suspendedReason?: string }>;
  signUp: (email: string, password: string, restaurantName: string, fullName: string, cnpj: string) => Promise<{ error: Error | null; userId?: string; userEmail?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedReason, setSuspendedReason] = useState<string | null>(null);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);

        // Fetch restaurant with is_active status
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('id, name, slug, logo_url, is_active, suspended_at, suspended_reason')
          .eq('id', profileData.restaurant_id)
          .maybeSingle();

        if (restaurantData) {
          setRestaurant(restaurantData);
          
          // Check if restaurant is suspended
          if (restaurantData.is_active === false) {
            setIsSuspended(true);
            setSuspendedReason(restaurantData.suspended_reason);
          } else {
            setIsSuspended(false);
            setSuspendedReason(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setRestaurant(null);
        }
        setLoading(false);
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { error };
    }
    
    // Check if restaurant is suspended
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('user_id', data.user.id)
        .maybeSingle();
        
      if (profileData) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('is_active, suspended_reason')
          .eq('id', profileData.restaurant_id)
          .maybeSingle();
          
        if (restaurantData && restaurantData.is_active === false) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          return { 
            error: null, 
            suspended: true, 
            suspendedReason: restaurantData.suspended_reason || 'Acesso revogado pelo administrador' 
          };
        }
      }
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, restaurantName: string, fullName: string, cnpj: string) => {
    try {
      // Create the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) return { error: authError };
      if (!authData.user) return { error: new Error('Failed to create user') };

      // Generate slug
      const slug = restaurantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const uniqueSlug = `${slug}-${Date.now()}`;
      const cnpjDigits = cnpj.replace(/\D/g, '');

      // Use the security definer function to create restaurant, profile, and role
      // This bypasses RLS issues during signup
      const { data: restaurantId, error: createError } = await supabase
        .rpc('create_restaurant_with_profile', {
          _user_id: authData.user.id,
          _restaurant_name: restaurantName,
          _restaurant_slug: uniqueSlug,
          _cnpj: cnpjDigits,
          _full_name: fullName,
        });

      if (createError) {
        console.error('Signup creation error:', createError);
        return { error: createError };
      }

      // Send verification code
      try {
        const { error: emailError } = await supabase.functions.invoke('send-verification-code', {
          body: {
            email: email,
            userId: authData.user.id,
          },
        });

        if (emailError) {
          console.error('Error sending verification code:', emailError);
          // Don't fail signup if email fails - user can request resend
        }
      } catch (emailErr) {
        console.error('Error invoking verification code function:', emailErr);
      }

      // Fetch the user data after successful creation
      if (authData.session) {
        await fetchUserData(authData.user.id);
      }

      return { error: null, userId: authData.user.id, userEmail: email };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRestaurant(null);
    setIsSuspended(false);
    setSuspendedReason(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, restaurant, loading, isSuspended, suspendedReason, signIn, signUp, signOut }}>
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
