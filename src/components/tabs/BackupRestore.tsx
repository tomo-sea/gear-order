'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Users,
  Package,
  History,
  ShieldCheck,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { format } from 'date-fns';

const BackupRestore = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchLastBackupTime();
  }, []);

  const fetchLastBackupTime = async () => {
    const { data } = await supabase
      .from('kr_settings')
      .select('value')
      .eq('key', 'last_backup_at')
      .single();
    if (data) setLastBackupAt(data.value);
  };

  const updateLastBackupTime = async () => {
    const now = new Date().toISOString();
    await supabase.from('kr_settings').upsert({ key: 'last_backup_at', value: now });
    setLastBackupAt(now);
  };

  const handleExport = async (table: string, fileName: string) => {
    setIsExporting(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;

      if (!data || data.length === 0) {
        setMessage({ type: 'error', text: `${table} 테이블에 데이터가 없습니다.` });
        return;
      }

      const csv = Papa.unparse(data);
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await updateLastBackupTime();
      setMessage({ type: 'success', text: `${fileName} 백업이 완료되었습니다.` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `백업 중 오류 발생: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (table: string, file: File) => {
    setIsImporting(true);
    setMessage(null);
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // JSON fields handling (for kr_quotes.items)
            const processedData = results.data.map((row: any) => {
              const newRow = { ...row };
              // if table is kr_quotes, parse items string back to JSON
              if (table === 'kr_quotes' && typeof newRow.items === 'string') {
                try {
                   newRow.items = JSON.parse(newRow.items);
                } catch (e) {
                   // if it's already an object or fails, leave as is
                }
              }
              return newRow;
            });

            const { error } = await supabase.from(table).upsert(processedData);
            if (error) throw error;
            
            setMessage({ type: 'success', text: `${table} 데이터 복구가 완료되었습니다.` });
          } catch (err: any) {
            setMessage({ type: 'error', text: `복구 중 오류 발생: ${err.message}` });
          } finally {
            setIsImporting(false);
          }
        }
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: `파일 읽기 오류: ${err.message}` });
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-[#002561] p-2.5 rounded-2xl shadow-lg shadow-blue-900/10">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-[28px] font-light text-[#002561] tracking-tight">데이터 백업 및 복구 센터</h1>
          </div>
          <p className="text-slate-500 font-light text-[16px]">시스템의 모든 데이터를 안전하게 파일로 보관하고 복구할 수 있습니다.</p>
        </div>
        
        <div className="bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl flex items-center gap-4">
          <div className="bg-slate-50 p-2 rounded-xl">
             <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-[12px] font-light text-slate-400 block uppercase tracking-widest">마지막 백업 일시</span>
            <span className="text-[15px] font-medium text-[#002561]">
              {lastBackupAt ? format(new Date(lastBackupAt), 'yyyy-MM-dd HH:mm:ss') : '기록 없음'}
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-[15px] font-light">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <Download className="w-5 h-5 text-[#0064DE]" />
            <h2 className="text-[18px] font-medium text-[#002561]">데이터 안전하게 내보내기 (Backup)</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'kr_customers', label: '거래처 정보', icon: Users, desc: '등록된 모든 업체 마스터 데이터' },
              { id: 'kr_inventory', label: '재고 현황', icon: Package, desc: '현재 상품별 실재고 및 안전재고 데이터' },
              { id: 'kr_quotes', label: '영업 판매 대장', icon: History, desc: '발행된 모든 견적서 및 판매 이력' },
            ].map(table => (
              <button
                key={table.id}
                onClick={() => handleExport(table.id, table.label)}
                disabled={isExporting}
                className="group w-full bg-white hover:bg-slate-50 border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 group-hover:bg-white p-3 rounded-2xl transition-colors">
                    <table.icon className="w-6 h-6 text-slate-400 group-hover:text-[#0064DE]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-medium text-[#002561]">{table.label} 전체 백업</h3>
                    <p className="text-[13px] text-slate-400 font-light mt-0.5">{table.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
              </button>
            ))}
          </div>

          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 space-y-3">
             <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[14px] font-medium">주의 사항</span>
             </div>
             <p className="text-[13px] text-amber-600/80 font-light leading-relaxed">
               내보낸 CSV 파일에는 고객 정보 및 내부 영업 데이터가 포함되어 있으므로 보안에 유의하여 관리해 주시기 바랍니다. 정기적인 백업은 데이터 유실을 방지하는 가장 좋은 방법입니다.
             </p>
          </div>
        </div>

        {/* Import Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <Upload className="w-5 h-5 text-[#0064DE]" />
            <h2 className="text-[18px] font-medium text-[#002561]">데이터 불러오기 및 복구 (Restore)</h2>
          </div>

          <div className="space-y-4">
             {[
               { id: 'kr_customers', label: '거래처 정보 복구', icon: Users },
               { id: 'kr_inventory', label: '재고 현황 복구', icon: Package },
               { id: 'kr_quotes', label: '판매 대장 복구', icon: History },
             ].map(table => (
               <div key={table.id} className="relative group">
                 <input
                   type="file"
                   accept=".csv"
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) handleImport(table.id, file);
                   }}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   disabled={isImporting}
                 />
                 <div className="bg-white border-2 border-dashed border-slate-100 group-hover:border-[#0064DE]/30 p-6 rounded-[2.5rem] transition-all flex items-center justify-between group-hover:bg-[#EEF6FF]/30">
                    <div className="flex items-center gap-4">
                       <div className="bg-slate-50 p-3 rounded-2xl">
                         <table.icon className="w-6 h-6 text-slate-300 group-hover:text-[#0064DE]/50" />
                       </div>
                       <div>
                         <h3 className="text-[16px] font-medium text-[#002561]">{table.label}</h3>
                         <p className="text-[13px] text-slate-400 font-light mt-0.5">백업된 CSV 파일을 선택하세요</p>
                       </div>
                    </div>
                    <div className="bg-[#002561] text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4" />
                    </div>
                 </div>
               </div>
             ))}
          </div>

          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 space-y-3">
             <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[14px] font-medium">안전한 데이터 복구</span>
             </div>
             <p className="text-[13px] text-emerald-600/80 font-light leading-relaxed">
               복구 시 기존 데이터와 ID가 동일한 경우 최신 백업 파일의 내용으로 업데이트(Upsert)됩니다. 새로운 데이터는 추가로 삽입됩니다. 이 방식은 데이터 유실 없이 안전하게 복구를 진행합니다.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
);

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
);

export default BackupRestore;
