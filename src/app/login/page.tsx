'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Lock, User, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 이미 로그인되어 있는지 확인
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        // 권한 체크 (user_metadata에 role이 'admin' 또는 'manager'인지 확인)
        const role = data.user.user_metadata?.role || data.user.app_metadata?.role;
        
        // 만약 관리자 등급이 엄격히 필요하다면 아래 주석을 해제하세요.
        // if (role !== 'admin' && role !== 'manager') {
        //   await supabase.auth.signOut();
        //   throw new Error('관리자 권한이 없습니다.');
        // }

        router.push('/');
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 일치하지 않습니다.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="w-full max-w-[450px] relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-[#002561] p-4 rounded-[2rem] shadow-2xl mb-6 shadow-blue-900/20">
            <LayoutDashboard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-[28px] font-light tracking-tighter text-[#002561] uppercase flex flex-col items-center">
            SCUBABLE
            <span className="text-[12px] text-slate-400 tracking-[0.4em] font-light mt-1">Management System</span>
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-10 animate-in fade-in zoom-in-95 duration-1000">
          <div className="mb-8">
            <h2 className="text-[22px] font-medium text-[#002561]">관리자 로그인</h2>
            <p className="text-slate-400 text-[14px] font-light mt-1">시스템 동기화 및 보안을 위해 인증이 필요합니다.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[12px] font-light text-slate-400 uppercase tracking-widest ml-1">계정 이메일</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#0064DE] transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@scubable.kr"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-14 pr-6 py-4.5 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-light text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#0064DE] transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-14 pr-6 py-4.5 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-3.5 rounded-2xl text-[14px] font-light flex items-center gap-3 animate-shake">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#002561] text-white py-5 rounded-[1.8rem] font-bold text-[18px] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  접속하기
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center mt-10 text-[12px] font-light text-slate-300 uppercase tracking-widest">
          © 2026 SCUBABLE SECURITY CORE V2.0 PREMIUM
        </p>
      </div>
    </div>
  );
}
