'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, LayoutDashboard } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && pathname !== '/login') {
        router.push('/login');
      } else if (session && pathname === '/login') {
        router.push('/');
      } else {
        setLoading(false);
      }
    };

    checkAuth();

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN' && pathname === '/login') {
        router.push('/');
      }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (loading && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
         <div className="bg-[#002561] p-5 rounded-[2.5rem] shadow-2xl mb-8 animate-pulse">
            <LayoutDashboard className="w-12 h-12 text-white" />
          </div>
          <div className="flex items-center gap-3 text-[#002561] font-light text-[18px]">
            <Loader2 className="w-6 h-6 animate-spin" />
            보안 세션 확인 중...
          </div>
      </div>
    );
  }

  return <>{children}</>;
}
