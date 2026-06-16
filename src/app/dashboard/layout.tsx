"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardNav from '@/components/DashboardNav';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login if there is no session
        router.push('/auth/login');
      } else {
        setAuthenticated(true);
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes (logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setAuthenticated(false);
        router.push('/auth/login');
      } else {
        setAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-zinc-400 animate-pulse font-medium">Launching StudySprint Workspace...</p>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-950 text-white">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-h-screen">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
