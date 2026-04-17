'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  RefreshCcw, 
  AlertCircle, 
  Search,
  Filter,
  CheckCircle2,
  TrendingDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const InventoryManagement = ({ isActive }: { isActive: boolean }) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastCheckDate, setLastCheckDate] = useState<string | null>(null);
  const [isUpdatingCheck, setIsUpdatingCheck] = useState(false);

  const fetchInventory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('kr_inventory')
      .select('*')
      .order('product_desc', { ascending: true });

    if (!error && data) {
      setInventory(data);
    }
    
    // 마지막 점검일 가져오기
    const { data: settingsData } = await supabase
      .from('kr_settings')
      .select('value')
      .eq('key', 'last_stock_check_at')
      .single();
    
    if (settingsData) {
      setLastCheckDate(settingsData.value);
    }

    setIsLoading(false);
  };

  const handleStockCheckComplete = async () => {
    if (!confirm('현재 DB 재고가 실재고와 일치함을 확인하셨습니까?')) return;
    
    setIsUpdatingCheck(true);
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('kr_settings')
      .upsert({ 
        key: 'last_stock_check_at', 
        value: now,
        updated_at: now
      });

    if (!error) {
      setLastCheckDate(now);
      alert('실재고 점검 완료가 기록되었습니다.');
    } else {
      alert('기록 중 오류가 발생했습니다.');
    }
    setIsUpdatingCheck(false);
  };

  useEffect(() => {
    if (isActive) {
      fetchInventory();
    }
  }, [isActive]);

  const filteredInventory = inventory.filter(item => 
    item.product_desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = inventory.filter(item => item.available_qty < 2).length;

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-700 max-w-4xl mx-auto pb-12">
      {/* Header Section Compact & Centered */}
      <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#EEF6FF] p-3 rounded-2xl">
            <Package className="w-6 h-6 text-[#0064DE]" />
          </div>
          <div>
            <h2 className="text-[20px] font-light tracking-tighter text-[#002561]">재고 실시간 현황</h2>
            <p className="text-[14px] font-light text-slate-500 mt-0.5 uppercase tracking-widest">Total {inventory.length} SKUs</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-8 border-r border-slate-100 pr-8">
             <div className="flex flex-col items-center">
                <span className="text-[14px] font-light text-slate-600 uppercase tracking-tighter">전체</span>
                <span className="text-[20px] font-light text-[#002561] leading-none mt-1">{inventory.length}</span>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[14px] font-light text-slate-600 uppercase tracking-tighter">부족</span>
                <span className="text-[20px] font-light text-rose-500 leading-none mt-1">{lowStockCount}</span>
             </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="빠른 검색..."
              className="bg-slate-50 rounded-xl pl-10 pr-4 py-2.5 text-[16px] font-light text-[#002561] outline-none focus:bg-white border-2 border-transparent focus:border-[#0064DE]/10 transition-all w-48 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {lastCheckDate && (
              <div className="flex flex-col items-end mr-2">
                <span className="text-[14px] font-light text-slate-500 uppercase tracking-tighter">최근 점검</span>
                <span className="text-[16px] font-light text-[#0064DE]">
                  {new Date(lastCheckDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                </span>
              </div>
            )}
            <button 
              onClick={handleStockCheckComplete}
              disabled={isUpdatingCheck}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[16px] font-light tracking-tighter transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              실재고 점검 완료
            </button>
          </div>
          <button 
            onClick={fetchInventory}
            className="text-[#002561] hover:text-[#0064DE] transition-colors p-1"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-blue-900/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-50">
                <th className="px-6 py-4 text-left text-[14px] font-light text-slate-600 uppercase tracking-widest">바코드</th>
                <th className="px-6 py-4 text-left text-[14px] font-light text-slate-600 uppercase tracking-widest">상품명 및 옵션</th>
                <th className="px-6 py-4 text-center text-[14px] font-light text-slate-600 uppercase tracking-widest">재고</th>
                <th className="px-6 py-4 text-center text-[14px] font-light text-slate-500 uppercase tracking-widest">안전</th>
                <th className="px-6 py-4 text-right text-[14px] font-light text-slate-600 uppercase tracking-widest pr-8">상태</th>
              </tr>
            </thead>
            <tbody className="">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-8 h-20 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredInventory.length > 0 ? (
                 filteredInventory.map((item) => {
                  const isLow = item.available_qty < 2;
                  // 상품 옵션별 고채도 컬러 결정 로직
                  const getProductColorStyles = (desc: string) => {
                    if (desc.includes('그린')) return 'text-[#2E7D32]'; // 비비드 포레스트 그린
                    if (desc.includes('레드')) return 'text-[#FF0000]'; // 비비드 순수 레드
                    if (desc.includes('블루')) return 'text-[#0055FF]'; // 선명한 일렉트릭 블루
                    if (desc.includes('블랙')) return 'text-[#000000]'; // 트루 블랙
                    if (desc.includes('화이트')) return 'bg-[#444444] text-white px-2 py-0.5 rounded-md shadow-sm'; // 다크그레이 배경 반전
                    return 'text-[#002561]'; // 기본 다크 블루
                  };

                  return (
                    <tr key={item.barcode} className={`group hover:bg-[#F8FAFC] transition-colors border-b border-slate-50 last:border-0 ${isLow ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-6 py-2.5">
                        <span className="text-[14px] font-normal text-[#0064DE] tracking-tighter">
                          {item.barcode}
                        </span>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-3 text-left">
                          <span className={`text-[16px] font-light tracking-tight ${getProductColorStyles(item.product_desc)}`}>
                            {item.product_desc}
                          </span>
                          <span className="text-[14px] font-light text-slate-600 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {item.color_key} / {item.size_key}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] h-8 px-2 rounded-lg font-light text-[18px] ${isLow ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-50 text-slate-800'}`}>
                          {item.available_qty}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <span className="text-[14px] font-light text-slate-500 tracking-tighter tabular-nums">
                          {item.safety_qty}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-right pr-8">
                        {isLow ? (
                          <div className="inline-flex items-center gap-1.5 text-rose-500">
                            <AlertCircle className="w-4 h-4 animate-pulse" />
                            <span className="text-[14px] font-light uppercase tracking-tighter">재고 부족</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-slate-900">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[14px] font-light uppercase tracking-tighter">정상</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Package className="w-12 h-12" />
                      <p className="text-xl font-black italic tracking-tighter">일치하는 재고 정보가 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
