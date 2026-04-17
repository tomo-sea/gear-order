'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  DollarSign, 
  Percent, 
  Truck, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const OperatingSettings = ({ isActive }: { isActive?: boolean }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // 설정값 상태
  const [retailPrice, setRetailPrice] = useState(380000);
  const [discounts, setDiscounts] = useState({
    '공급파트너': 35,
    '다이빙센터': 30,
    '강사': 20
  });
  const [baseShipping, setBaseShipping] = useState(5000);
  const [jejuExtra, setJejuExtra] = useState(3000);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('kr_settings')
      .select('key, value');

    if (data) {
      data.forEach(item => {
        if (item.key === 'price_retail_xt_fin') setRetailPrice(parseInt(item.value));
        if (item.key === 'discount_rate_공급파트너') setDiscounts(prev => ({ ...prev, '공급파트너': parseInt(item.value) }));
        if (item.key === 'discount_rate_다이빙센터') setDiscounts(prev => ({ ...prev, '다이빙센터': parseInt(item.value) }));
        if (item.key === 'discount_rate_강사') setDiscounts(prev => ({ ...prev, '강사': parseInt(item.value) }));
        if (item.key === 'fee_shipping_base') setBaseShipping(parseInt(item.value));
        if (item.key === 'fee_shipping_jeju') setJejuExtra(parseInt(item.value));
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const settings = [
      { key: 'price_retail_xt_fin', value: retailPrice.toString() },
      { key: 'discount_rate_공급파트너', value: discounts['공급파트너'].toString() },
      { key: 'discount_rate_다이빙센터', value: discounts['다이빙센터'].toString() },
      { key: 'discount_rate_강사', value: discounts['강사'].toString() },
      { key: 'fee_shipping_base', value: baseShipping.toString() },
      { key: 'fee_shipping_jeju', value: jejuExtra.toString() }
    ];

    const { error } = await supabase
      .from('kr_settings')
      .upsert(settings);

    if (!error) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      alert('설정 저장 중 오류가 발생했습니다.');
    }
    setIsSaving(false);
  };

  useEffect(() => {
    if (isActive) fetchSettings();
  }, [isActive]);

  if (isLoading && isActive) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RotateCcw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="bg-[#EEF6FF] p-4 rounded-2xl shadow-inner border border-blue-50">
            <SettingsIcon className="w-8 h-8 text-[#0064DE]" />
          </div>
          <div>
            <h2 className="text-[24px] font-light tracking-tighter text-[#002561] leading-tight">운영 정책 설정</h2>
            <p className="text-[14px] font-light text-slate-500 mt-1 uppercase tracking-widest leading-none">Global Application Policy Manager</p>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-[18px] transition-all shadow-xl active:scale-95 ${
            isSaving 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-[#002561] text-white hover:bg-blue-600 shadow-blue-900/10'
          }`}
        >
          {isSaving ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          정책 저장하기
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 소비자가격 설정 */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign className="w-32 h-32" /></div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter shrink-0">Price</span>
            <h3 className="text-[18px] font-medium text-[#002561]">기본 소비자가격</h3>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] font-light">₩</span>
              <input 
                type="number"
                value={retailPrice}
                onChange={(e) => setRetailPrice(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 rounded-2xl pl-12 pr-6 py-5 text-[28px] font-bold text-[#002561] outline-none border-2 border-transparent focus:border-blue-100 transition-all shadow-inner"
              />
            </div>
            <p className="text-[14px] text-slate-400 font-light pl-1">※ 다이브라이트 XT핀 기준 정가입니다.</p>
          </div>
        </div>

        {/* 배송비 설정 */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Truck className="w-32 h-32" /></div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter shrink-0">Logistics</span>
            <h3 className="text-[18px] font-medium text-[#002561]">배송비 정책</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-slate-500 ml-1">기본 배송비</label>
              <div className="relative">
                <input 
                  type="number"
                  value={baseShipping}
                  onChange={(e) => setBaseShipping(parseInt(e.target.value) || 0)}
                  className="w-full bg-emerald-50/30 rounded-2xl px-6 py-4 text-[20px] font-bold text-emerald-700 outline-none border border-emerald-100 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-emerald-500">원</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-slate-500 ml-1">제주 할증</label>
              <div className="relative">
                <input 
                  type="number"
                  value={jejuExtra}
                  onChange={(e) => setJejuExtra(parseInt(e.target.value) || 0)}
                  className="w-full bg-amber-50/30 rounded-2xl px-6 py-4 text-[20px] font-bold text-amber-700 outline-none border border-amber-100 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-amber-500">원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 등급별 할인율 설정 */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/4 -translate-y-1/4 group-hover:opacity-10 transition-all"><Zap className="w-96 h-96" /></div>
        
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-purple-50 p-3 rounded-xl">
             <Percent className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-[20px] font-medium text-[#002561]">등급별 할인율 정책</h3>
            <p className="text-[14px] font-light text-slate-500">거래처 등급 및 직책에 따른 기본 적용 할인율입니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {[
            { key: '공급파트너', color: 'blue', label: '공급파트너 / 수입원' },
            { key: '다이빙센터', color: 'emerald', label: '다이빙센터' },
            { key: '강사', color: 'indigo', label: '전문 강사' }
          ].map((tier) => (
            <div key={tier.key} className={`bg-white border-2 border-slate-50 rounded-3xl p-6 transition-all hover:shadow-lg hover:border-${tier.color}-100`}>
              <div className="flex flex-col gap-4">
                <span className={`text-[14px] font-bold text-slate-400 uppercase tracking-widest`}>
                  {tier.label}
                </span>
                <div className="flex items-center justify-between">
                  <input 
                    type="number"
                    value={discounts[tier.key as keyof typeof discounts]}
                    onChange={(e) => setDiscounts(prev => ({ ...prev, [tier.key]: parseInt(e.target.value) || 0 }))}
                    className={`bg-slate-50 rounded-2xl px-4 py-3 text-[32px] font-bold text-[#002561] w-24 outline-none border-2 border-transparent focus:border-blue-100 transition-all`}
                  />
                  <span className="text-[24px] font-light text-slate-300">% OFF</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-6 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100">
           <AlertCircle className="w-5 h-5 text-[#002561] shrink-0" />
           <p className="text-[14px] font-light text-slate-600 leading-relaxed">
             이곳에서 변경한 할인율은 **새로 작성하는 견적**에 즉시 적용됩니다. <br/>
             이미 발행된 판매대장의 기록은 변경되지 않으며, 데이터 무결성을 위해 과거 내역은 당시 저장된 단가를 유지합니다.
           </p>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#002561] text-white px-10 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 z-[1000]">
           <CheckCircle2 className="w-6 h-6 text-emerald-400" />
           <span className="text-[18px] font-medium tracking-tight">모든 운영 정책이 성공적으로 반영되었습니다!</span>
        </div>
      )}
    </div>
  );
};

export default OperatingSettings;
