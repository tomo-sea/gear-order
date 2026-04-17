'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Upload, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  Building2,
  ExternalLink,
  MapPin,
  X,
  Save,
  User,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

interface Customer {
  id?: string;
  dealer_tier: string;
  company_name: string;
  manager_name?: string;
  ceo_name: string;
  phone: string;
  email: string;
  address: string;
  biz_number: string;
  biz_name?: string;
  tax_email?: string;
  instructor_rank?: string;
  notes: string;
}

const CustomerManagement = ({ isActive = false }: { isActive?: boolean }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState<Customer[]>([]);
  const [currentImportFile, setCurrentImportFile] = useState<string>('');

  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCustomer, setEditingCustomer] = useState<Customer>({
    dealer_tier: '강사',
    company_name: '',
    ceo_name: '',
    phone: '',
    email: '',
    address: '',
    biz_number: '',
    biz_name: '',
    tax_email: '',
    notes: ''
  });

  useEffect(() => {
    if (isActive) fetchCustomers();
  }, [isActive]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kr_customers')
      .select('*')
      .order('biz_name', { ascending: true });
    
    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  // Add/Edit Model Actions
  const handleAddClick = () => {
    setModalMode('add');
    setEditingCustomer({
      dealer_tier: '강사',
      company_name: '',
      ceo_name: '',
      phone: '',
      email: '',
      address: '',
      biz_number: '',
      biz_name: '',
      tax_email: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setModalMode('edit');
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer.company_name || !editingCustomer.ceo_name || !editingCustomer.phone) {
      alert('필수 정보를 모두 입력해주세요. (업체명, 대표자명, 연락처)');
      return;
    }

    setLoading(true);
    if (modalMode === 'add') {
      const { error } = await supabase.from('kr_customers').insert([editingCustomer]);
      if (error) alert('저장 중 오류 발생: ' + error.message);
      else setIsModalOpen(false);
    } else {
      const { error } = await supabase.from('kr_customers').update(editingCustomer).eq('id', editingCustomer.id);
      if (error) alert('수정 중 오류 발생: ' + error.message);
      else setIsModalOpen(false);
    }
    await fetchCustomers();
    setLoading(false);
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`[${name}] 거래처를 정말 삭제하시겠습니까?`)) return;
    setLoading(true);
    const { error } = await supabase.from('kr_customers').delete().eq('id', id);
    if (error) alert('삭제 실패: ' + error.message);
    await fetchCustomers();
    setLoading(false);
  };

  // CSV Import logic
  const handleCSVImport = async (file: File, tier: string) => {
    setImporting(true);
    setCurrentImportFile(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawData = results.data as any[];
        const newCustomers: Customer[] = rawData.map(row => {
          const company_name = (row['회  사  명'] || row['회 사 명'] || row['회사명'] || row['이름'] || '').trim();
          const manager_name = (row['담 당 자'] || row['담당자'] || '').trim();
          const ceo_name = (row['대      표'] || row['대 표'] || row['대표'] || row['이름'] || '').trim();
          const phone = (row['연    락    처'] || row['연 락 처'] || row['연락처'] || '').trim();
          const email = (row['이   메   일'] || row['이 메 일'] || row['이메일'] || '').trim();
          const address = (row['주        소'] || row['주 소'] || row['주소'] || '').trim();
          const biz_number = (row['사업자등록번호'] || '').trim();
          const biz_name = (row['상호'] || '').trim();
          const tax_email = (row['세금용이메일'] || '').trim();
          const instructor_rank = (row['강사등급'] || '').trim();

          return {
            dealer_tier: tier,
            company_name,
            manager_name,
            ceo_name,
            phone,
            email,
            address,
            biz_number,
            biz_name,
            tax_email,
            instructor_rank,
            notes: row['비고1'] || row['비고'] || row['단체 및 강사번호'] || '',
          };
        }).filter(c => c.company_name);

        const duplicates: Customer[] = [];
        const toInsert: Customer[] = [];

        for (const customer of newCustomers) {
          const existing = customers.find(c => c.company_name === customer.company_name);
          if (existing) duplicates.push({ ...customer, id: existing.id });
          else toInsert.push(customer);
        }

        if (duplicates.length > 0) {
          setDuplicateData(duplicates);
          setShowDuplicateModal(true);
        }

        if (toInsert.length > 0) {
          const { error } = await supabase.from('kr_customers').insert(toInsert);
          if (error) console.error('Insert error:', error);
        }
        await fetchCustomers();
        setImporting(false);
      }
    });
  };

  const handleOverwrite = async () => {
    setLoading(true);
    for (const customer of duplicateData) {
      await supabase.from('kr_customers').update(customer).eq('id', customer.id);
    }
    setShowDuplicateModal(false);
    await fetchCustomers();
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.biz_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ceo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.instructor_rank?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-40">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-[28px] font-light tracking-tighter text-[#002561] flex items-center gap-3">
            <div className="bg-[#EEF6FF] p-2 rounded-2xl shadow-sm">
              <Users className="w-6 h-6 text-[#0064DE]" />
            </div>
            거래처 관리
          </h2>
          <p className="text-slate-500 mt-1 text-[16px] font-light">거래처 정보를 등록하고 딜러 등급별로 관리하세요.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm p-1.5 flex gap-1">
            <button onClick={handleAddClick} className="flex items-center gap-2 px-6 py-3.5 text-[16px] font-light text-[#002561] hover:bg-slate-50 rounded-[1.2rem] transition-all">
              <Plus className="w-4 h-4 text-[#0064DE]" /> 신규 등록
            </button>
            <div className="w-[1px] bg-slate-100 h-6 my-auto mx-2" />
            <label className="flex items-center gap-2 px-6 py-3.5 text-[16px] font-light text-[#0064DE] bg-[#EEF6FF] rounded-[1.2rem] hover:bg-[#E0F0FF] transition-all cursor-pointer shadow-sm">
              <Upload className="w-4 h-4" /> CSV 일괄 등록
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCSVImport(file, '강사'); }} />
            </label>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: '전체', count: customers.length, color: 'bg-slate-800' },
          { label: '강사', count: customers.filter(c => c.dealer_tier === '강사').length, color: 'bg-[#5B21B6]' },
          { label: '공급파트너', count: customers.filter(c => c.dealer_tier === '공급파트너').length, color: 'bg-[#1E40AF]' },
          { label: '다이빙센터', count: customers.filter(c => c.dealer_tier === '다이빙센터').length, color: 'bg-[#065F46]' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-[2rem] px-6 py-4 flex items-center gap-4 shadow-sm min-w-[170px] hover:scale-[1.02] transition-transform">
            <div className={`w-1.5 h-8 rounded-full ${stat.color} shadow-sm`} />
            <div>
              <span className="text-[14px] font-light text-slate-500 uppercase tracking-widest leading-none">{stat.label}</span>
              <p className="text-[20px] font-light text-[#002561] leading-none mt-1">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#0064DE] transition-colors" />
        <input type="text" placeholder="업체명, 대표자명, 연락처, 메모 등으로 검색하세요..." className="w-full bg-white border-2 border-slate-50 rounded-[2rem] pl-16 pr-6 py-5 focus:outline-none focus:ring-4 focus:ring-[#0064DE]/5 focus:border-[#0064DE]/10 transition-all font-light text-[16px] text-[#002561] shadow-xl shadow-slate-100 placeholder:text-slate-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center animate-in fade-in">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#0064DE] border-t-transparent rounded-full animate-spin" />
              <span className="text-[14px] font-light text-[#002561] tracking-tighter">데이터 처리 중...</span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-50">
                <th className="px-8 py-6 text-left text-[14px] font-light text-slate-600 uppercase tracking-widest w-[160px]">등급 / 상호</th>
                <th className="px-8 py-6 text-left text-[14px] font-light text-slate-600 uppercase tracking-widest min-w-[200px]">거래처 정보</th>
                <th className="px-6 py-5 text-left text-[14px] font-light text-slate-600 uppercase tracking-widest w-[140px]">대표 및 담당자</th>
                <th className="px-6 py-5 text-left text-[14px] font-light text-slate-600 uppercase tracking-widest w-[260px]">연락처 및 이메일</th>
                <th className="px-6 py-5 text-left text-[14px] font-light text-slate-600 uppercase tracking-widest w-[150px]">사업자 정보</th>
                <th className="px-8 py-6 text-center text-[14px] font-light text-slate-600 uppercase tracking-widest w-[120px]">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-8 py-7">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-[14px] font-light uppercase tracking-tighter w-fit shadow-sm ${
                          customer.dealer_tier === '강사' ? 'bg-purple-100 text-purple-700' : customer.dealer_tier === '공급파트너' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>{customer.dealer_tier}</span>
                        <span className="text-[14px] font-light text-slate-400 truncate max-w-[120px]">{customer.biz_name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] font-light text-[#002561] tracking-tight">{customer.biz_name || customer.company_name}</span>
                          {customer.instructor_rank && <span className="bg-slate-100 text-slate-600 text-[14px] font-light px-2 py-0.5 rounded-full uppercase border border-slate-200">{customer.instructor_rank}</span>}
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                          <span className="text-[14px] font-light text-slate-500">관리명: {customer.company_name}</span>
                          <span className="text-[14px] text-slate-500 font-light truncate max-w-[220px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {customer.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex flex-col">
                        <span className="text-[16px] font-light text-[#002561]/80">{customer.ceo_name}</span>
                        {customer.manager_name && customer.manager_name !== customer.ceo_name && <span className="text-[14px] text-slate-500 font-light mt-1">담당: {customer.manager_name}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#0064DE]" /><span className="text-[16px] font-light text-slate-600">{customer.phone}</span></div>
                        <div className="flex flex-col text-[14px] text-slate-500 ml-3.5 font-light"><span>{customer.email}</span>{customer.tax_email && customer.tax_email !== customer.email && <span className="text-emerald-500 font-light mt-0.5">TAX: {customer.tax_email}</span>}</div>
                      </div>
                    </td>
                    <td className="px-6 py-7"><span className="text-[14px] font-mono font-light text-slate-400">{customer.biz_number || '-'}</span></td>
                    <td className="px-8 py-7 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEditClick(customer)} className="p-3 bg-slate-50 text-slate-400 hover:text-[#0064DE] hover:bg-[#EEF6FF] rounded-2xl transition-all shadow-sm"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCustomer(customer.id!, customer.company_name)} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-24 text-center"><div className="flex flex-col items-center gap-4 text-slate-200"><Search className="w-16 h-16 opacity-10" /><p className="text-[14px] font-light tracking-tighter">등록된 거래처가 없거나 검색 결과가 없습니다.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-[#002561]/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 scrollbar-hide">
            
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  <div className="bg-[#EEF6FF] p-3 rounded-2xl"><Building2 className="w-6 h-6 text-[#0064DE]" /></div>
                  <div>
                    <h3 className="text-[20px] font-light tracking-tighter text-[#002561]">{modalMode === 'add' ? '신규 거래처 등록' : '거래처 정보 수정'}</h3>
                    <p className="text-slate-500 text-[14px] font-light">{modalMode === 'add' ? '새로운 딜러 정보를 입력하세요.' : '기존 업체 정보를 수정합니다.'}</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-300" /></button>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">딜러 등급</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.dealer_tier} onChange={(e) => setEditingCustomer({...editingCustomer, dealer_tier: e.target.value})}>
                       <option value="강사">강사</option>
                       <option value="공급파트너">공급파트너</option>
                       <option value="파트너">파트너</option>
                       <option value="다이빙센터">다이빙센터</option>
                       <option value="기타">기타</option>
                    </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">강사 등급 (필요시)</label>
                   <input placeholder="예: CD, MI, OWSI" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.instructor_rank || ''} onChange={(e) => setEditingCustomer({...editingCustomer, instructor_rank: e.target.value})} />
                </div>
                 <div className="space-y-2">
                    <label className="text-[14px] font-light text-[#0064DE] uppercase tracking-widest ml-1">공식 상호 (사업자등록증상)</label>
                    <input placeholder="사업자등록증에 적힌 정확한 상호를 입력하세요" className="w-full bg-[#EEF6FF] border-2 border-[#0064DE]/10 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.biz_name || ''} onChange={(e) => setEditingCustomer({...editingCustomer, biz_name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">사업자등록번호</label>
                    <input placeholder="000-00-00000" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.biz_number || ''} onChange={(e) => setEditingCustomer({...editingCustomer, biz_number: e.target.value})} />
                 </div>
               <div className="space-y-2">
                  <label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">내부 관리용 업체명</label>
                  <input placeholder="간단히 부를 업체명" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.company_name} onChange={(e) => setEditingCustomer({...editingCustomer, company_name: e.target.value})} />
               </div>
               <div className="space-y-2"><label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">대표자명 (필수)</label><input placeholder="성함" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.ceo_name} onChange={(e) => setEditingCustomer({...editingCustomer, ceo_name: e.target.value})} /></div>
               <div className="space-y-2"><label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">연락처 (필수)</label><input placeholder="010-0000-0000" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.phone} onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">일반 이메일</label><input placeholder="example@email.com" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.email} onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[14px] font-light text-emerald-600 uppercase tracking-widest ml-1">세금계산서용 이메일</label><input placeholder="tax@email.com" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.tax_email || ''} onChange={(e) => setEditingCustomer({...editingCustomer, tax_email: e.target.value})} /></div>
               <div className="space-y-2 md:col-span-2"><label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">기본 발송 주소</label><input placeholder="주소를 정확히 입력하세요" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all" value={editingCustomer.address} onChange={(e) => setEditingCustomer({...editingCustomer, address: e.target.value})} /></div>
               <div className="space-y-2 md:col-span-2"><label className="text-[14px] font-light text-slate-600 uppercase tracking-widest ml-1">비고 / 내부 메모</label><textarea placeholder="추가 정보를 기록하세요 (예: 자격증 번호, 주요 거래 브랜드 등)" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-[16px] font-light text-[#002561] outline-none focus:border-[#0064DE] transition-all h-24" value={editingCustomer.notes} onChange={(e) => setEditingCustomer({...editingCustomer, notes: e.target.value})} /></div>
             </div>

             <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4.5 bg-slate-200 text-slate-700 font-light text-[16px] rounded-2xl hover:bg-slate-300 transition-all border-none cursor-pointer"
                >
                  취소
                </button>
                <button onClick={handleSaveCustomer} className="flex-[2] py-5 rounded-[1.5rem] bg-[#002561] text-white text-[18px] font-light shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  <Save className="w-5 h-5" /> {modalMode === 'add' ? '거래처 등록 완료' : '정보 수정 완료'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Duplicate Check Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 sm:p-0">
          <div className="fixed inset-0 bg-[#002561]/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowDuplicateModal(false)} />
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="bg-amber-50 p-5 rounded-[2rem]"><AlertTriangle className="w-12 h-12 text-amber-500" /></div>
              <div>
                <h3 className="text-[20px] font-light tracking-tighter text-[#002561]">중복 업체 감지됨</h3>
                <p className="text-slate-500 mt-2 text-[14px] font-light leading-relaxed">임포트하려는 이력에 이미 존재하는 업체 <span className="font-light text-[#0064DE]">{duplicateData.length}개</span>가 발견되었습니다.<br />어떻게 처리하시겠습니까?</p>
              </div>
              <div className="w-full h-[1px] bg-slate-100 my-2" />
              <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={() => setShowDuplicateModal(false)} className="py-4 px-6 rounded-2xl border border-slate-200 text-slate-500 font-light hover:bg-slate-50 transition-all">중복 건너뛰기</button>
                <button onClick={handleOverwrite} className="py-4 px-6 rounded-2xl bg-[#0064DE] text-white font-light shadow-lg shadow-blue-500/20 hover:bg-[#0052B5] hover:scale-[1.02] active:scale-[0.98] transition-all">새 정보로 덮어쓰기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
