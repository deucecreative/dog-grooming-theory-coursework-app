"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        // Profile doesn't exist yet, this can happen if the trigger failed
        console.log('Profile not found for user:', userId, '- attempting to create...');
        
        // Try to create the profile as fallback
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const newProfile = {
            id: userId,
            email: user.email,
            full_name: null,
            role: 'student' as const,
            status: 'pending' as const,
            approved_by: null,
            approved_at: null,
            rejection_reason: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);
          
          if (!insertError) {
            setProfile(newProfile);
            console.log('Profile created successfully');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [supabase]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchProfile]);


  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    profile,
    loading,
    supabase,
    signOut,
  };
}