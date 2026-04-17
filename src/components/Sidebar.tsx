import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  ClipboardList, 
  Users, 
  LayoutDashboard, 
  LogOut,
  ChevronRight,
  Package,
  AlertTriangle,
  Calendar,
  Clock,
  Database,
  Settings as SettingsIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'order-entry', label: '견적 입력', icon: PlusCircle },
    { id: 'order-history', label: '판매대장', icon: ClipboardList },
    { id: 'inventory', label: '재고 관리', icon: Package },
    { id: 'customer-management', label: '거래처 관리', icon: Users },
    { id: 'backup', label: '백업/복구', icon: Database },
    { id: 'operating-settings', label: '운영 설정', icon: SettingsIcon },
  ];

  const [lastCheckDate, setLastCheckDate] = useState<string | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [unpaidCount, setUnpaidCount] = useState(0);

  const fetchOperationalData = async () => {
    // 1. 마지막 점검일 가져오기
    const { data: settingsData } = await supabase
      .from('kr_settings')
      .select('value')
      .eq('key', 'last_stock_check_at')
      .single();
    if (settingsData) setLastCheckDate(settingsData.value);
    
    // 1-2. 마지막 백업일 가져오기
    const { data: backupData } = await supabase
      .from('kr_settings')
      .select('value')
      .eq('key', 'last_backup_at')
      .single();
    if (backupData) setLastBackupDate(backupData.value);

    // 2. 미결제(issued) 건수 가져오기
    const { count } = await supabase
      .from('kr_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'issued');
    setUnpaidCount(count || 0);
  };

  useEffect(() => {
    fetchOperationalData();
    // 5분마다 갱신
    const interval = setInterval(fetchOperationalData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const daysSinceCheck = lastCheckDate 
    ? Math.floor((new Date().getTime() - new Date(lastCheckDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysSinceBackup = lastBackupDate
    ? Math.floor((new Date().getTime() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="w-64 h-screen bg-[#002561] text-white flex flex-col flex-shrink-0 sticky top-0 overflow-y-auto border-r border-white/5 shadow-2xl">
      {/* Brand Header */}
      <div className="px-8 py-10 flex flex-col gap-1 border-b border-white/5 bg-[#001D4D]">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
            <LayoutDashboard className="w-6 h-6 text-[#0064DE]" />
          </div>
          <h1 className="text-[20px] font-light tracking-tighter uppercase leading-none">
            SCUBABLE <br/>
            <span className="text-[14px] text-white/60 tracking-[0.2em] font-light mt-1 block">SALES ENGINE</span>
          </h1>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        <div className="mb-4 px-4 text-[14px] font-light text-white/60 uppercase tracking-widest">Main Menu</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-white text-[#002561] shadow-xl shadow-blue-900/10' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[#002561] text-white' : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[16px] font-light tracking-tight ${isActive ? 'text-[#002561]' : ''}`}>
                  {item.label}
                </span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 opacity-40" />}
            </button>
          );
        })}
      </nav>

      {/* Operation Dashboard (Homework) */}
      <div className="px-4 py-6">
        <div className="bg-white/5 rounded-[2rem] p-5 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-amber-500/20 p-1.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-[14px] font-light text-white/60 uppercase tracking-widest">Operation Alerts</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-light text-white/90">실재고 점검</span>
                <span className={`text-[14px] font-light px-2.5 py-0.5 rounded-full ${daysSinceCheck && daysSinceCheck > 3 ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {daysSinceCheck === 0 ? '오늘 완료' : `${daysSinceCheck}일 경과`}
                </span>
              </div>
              <p className="text-[14px] text-white/50 leading-tight">
                {daysSinceCheck && daysSinceCheck > 3 
                  ? '⚠️ 점검 요망!' 
                  : '정기적인 재고 확인 필요'}
              </p>
            </div>
 
            <div className="h-px bg-white/5" />
 
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-light text-white/90">데이터 백업</span>
                <span className={`text-[14px] font-light px-2.5 py-0.5 rounded-full ${daysSinceBackup !== null && daysSinceBackup > 7 ? 'bg-rose-500 text-white' : 'bg-[#0064DE] text-white shadow-lg'}`}>
                  {daysSinceBackup === null ? '기록 없음' : (daysSinceBackup === 0 ? '오늘 완료' : `${daysSinceBackup}일 경과`)}
                </span>
              </div>
              <p className="text-[14px] text-white/50 leading-tight">
                {daysSinceBackup !== null && daysSinceBackup > 7 
                  ? '⚠️ 서둘러 백업하세요!' 
                  : '데이터 안전 보관 중'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-white/5">
        <div 
          onClick={async () => {
            if (confirm('로그아웃 하시겠습니까?')) {
              await supabase.auth.signOut();
            }
          }}
          className="bg-white/5 rounded-3xl p-4 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0064DE] to-[#3B82F6] flex items-center justify-center font-light text-[14px] shadow-lg text-white">
              TM
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-light tracking-tight uppercase leading-none text-white">CEO Tomo</span>
              <span className="text-[14px] text-white/60 font-light tracking-widest mt-1">GLOBAL OPERATOR</span>
            </div>
          </div>
          <LogOut className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
