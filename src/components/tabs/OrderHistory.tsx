'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  ChevronRight, 
  CheckCircle, 
  Truck, 
  Box, 
  FileText, 
  MoreVertical,
  Edit2,
  Trash2,
  XCircle,
  Clock,
  ArrowUpDown,
  ExternalLink,
  MapPin,
  AlertCircle,
  Calendar,
  Save,
  Package,
  Download,
  FileDown,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { PRODUCT_XT_FIN } from '@/constants/products';

const DEFAULT_TIER_DISCOUNTS: Record<string, number> = {
  '공급파트너': 35,
  '파트너': 35,
  '다이빙센터': 30,
  '강사': 20,
  '기타': 0
};

interface Order {
  id: string;
  serial_number: string;
  items: any[];
  total_amount: number;
  status: string;
  is_tax_issued: boolean;
  created_at: string;
  order_date: string;
  order_note: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_fee: number;
  discount_rate: number;
  is_paid?: boolean;
  paid_at?: string | null;
  customer?: {
    company_name: string;
    dealer_tier: string;
    biz_name?: string;
    ceo_name?: string;
  };
}

const OrderHistory = ({ isActive = false, onEdit }: { isActive?: boolean; onEdit?: (order: any) => void }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tierDiscounts, setTierDiscounts] = useState<Record<string, number>>(DEFAULT_TIER_DISCOUNTS);
  const [retailPrice, setRetailPrice] = useState(PRODUCT_XT_FIN.retailPrice);

  const STATUS_CONFIG: Record<string, any> = {
    issued: { label: '견적서 발행완료', color: 'bg-blue-50 text-blue-600 ring-blue-500/20', icon: FileText, nextAction: '상품 발송', nextStatus: 'shipped' },
    paid: { label: '입금 및 대기(구버전)', color: 'bg-orange-50 text-orange-600 ring-orange-500/20', icon: CheckCircle, nextAction: '상품 발송', nextStatus: 'shipped' },
    shipped: { label: '상품 발송완료', color: 'bg-indigo-50 text-indigo-600 ring-indigo-500/20', icon: Package, nextAction: '송장 전달', nextStatus: 'tracking_sent' },
    tracking_sent: { label: '송장번호 전달됨', color: 'bg-purple-50 text-purple-600 ring-purple-500/20', icon: Truck, nextAction: '거래 완료', nextStatus: 'delivered' },
    delivered: { label: '거래 완료', color: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20', icon: CheckCircle, nextAction: null, nextStatus: null },
    cancelled: { label: '견적 취소됨', color: 'bg-red-50 text-red-600 ring-red-500/20', icon: XCircle, nextAction: null, nextStatus: null }
  };

  // Cancellation States
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  useEffect(() => {
    if (isActive) fetchOrders();
  }, [isActive]);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // 메뉴 외부 클릭 시 닫기 로직
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const fetchOrders = async () => {
    setLoading(true);
    
    // DB에서 모든 운영 설정 가져오기
    const { data: settingsData } = await supabase
      .from('kr_settings')
      .select('key, value');
      
    if (settingsData) {
      const discMapping: Record<string, number> = {};
      let rPrice = PRODUCT_XT_FIN.retailPrice;

      settingsData.forEach(item => {
        if (item.key.startsWith('discount_rate_')) {
          const tierName = item.key.replace('discount_rate_', '');
          discMapping[tierName] = parseInt(item.value) || 0;
        }
        if (item.key === 'price_retail_xt_fin') rPrice = parseInt(item.value);
      });

      setTierDiscounts(prev => ({ ...prev, ...discMapping }));
      setRetailPrice(rPrice);
    }

    const { data, error } = await supabase
      .from('kr_quotes')
      .select(`
        *,
        customer:kr_customers(company_name, dealer_tier, biz_name, ceo_name)
      `)
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  // PDF 다운로드 핸들러
  const handleDownloadPDF = (order: Order | any) => {
    if (!order) return;
    
    // 이전에 저장된 단가(unitPrice)가 있는지 확인하고, 없으면 현재 시점 계산 (하위 호환)
    const itemsWithCleanPrice = order.items.map((item: any) => {
      // 1순위: DB에 박제된 unitPrice (최신 저장본)
      // 2순위: 38만 소비자가 기준 당시 할인율 계산 (과거 저장본)
      const effectiveRate = order.discount_rate ?? 0;
      const priceAtSave = item.unitPrice || item.final_price || Math.floor(PRODUCT_XT_FIN.retailPrice * (1 - effectiveRate / 100));
      
      return {
        ...item,
        price: priceAtSave,
        individual_shipping: item.individual_shipping || item.individualShipping
      };
    });

    const pdfData = {
      recipientCompany: order.customer?.biz_name || order.customer?.company_name || order.shipping_name || '고객',
      items: itemsWithCleanPrice,
      serialNumber: order.serial_number,
      shippingInfo: {
        name: order.shipping_name,
        phone: order.shipping_phone,
        address: order.shipping_address
      },
      orderNote: order.order_note,
      orderDate: order.order_date,
      isJeju: order.shipping_address?.includes('제주') || false,
      manualDiscount: order.items.reduce((sum: number, item: any) => sum + (item.manualDiscount ?? 0), 0)
    };
    
    generateQuotePDF(pdfData);
  };

  const updateInventory = async (items: any[], type: 'deduct' | 'restore') => {
    try {
      // 품목별로 재고 수량을 증감시킵니다.
      for (const item of items) {
        if (!item.color || !item.size) continue;
        
        // 현재 재고 정보를 가져옵니다.
        const { data: invData } = await supabase
          .from('kr_inventory')
          .select('available_qty')
          .eq('color_key', item.color)
          .eq('size_key', item.size)
          .single();

        if (invData) {
          const currentQty = invData.available_qty;
          const newQty = type === 'deduct' ? currentQty - (item.quantity || 0) : currentQty + (item.quantity || 0);
          
          await supabase
            .from('kr_inventory')
            .update({ available_qty: newQty })
            .eq('color_key', item.color)
            .eq('size_key', item.size);
        }
      }
    } catch (err) {
      console.error('Inventory Sync Error:', err);
    }
  };

  const updateOrderStatus = async (id: string, currentStatus: string, direction: 'next' | 'prev' = 'next') => {
    const statusSequence = ['issued', 'shipped', 'tracking_sent', 'delivered'];
    const effectiveCurrent = currentStatus === 'paid' ? 'issued' : currentStatus;
    const currentIndex = statusSequence.indexOf(effectiveCurrent);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (targetIndex >= 0 && targetIndex < statusSequence.length) {
      if (direction === 'prev' && !confirm('정말 이전 상태로 되돌리시겠습니까?')) return;
      
        const nextStatus = statusSequence[targetIndex];
        
        // --- [재고 연동 로직] ---
        // 1. 견적 -> 발송 (차감) : 'issued'(또는 과거 paid)에서 'shipped'로 이동할 때
        if ((currentStatus === 'issued' || currentStatus === 'paid') && nextStatus === 'shipped') {
          const order = orders.find(o => o.id === id);
          if (order) await updateInventory(order.items, 'deduct');
        }
        
        // 2. 발송/송장전달/완료 -> 견적 (복구) : 'shipped' 이상 상태에서 'issued'로 돌아갈 때
        const deductedStatuses = ['shipped', 'tracking_sent', 'delivered'];
        if (deductedStatuses.includes(currentStatus) && nextStatus === 'issued') {
          const order = orders.find(o => o.id === id);
          if (order) await updateInventory(order.items, 'restore');
        }
        // -----------------------

        const statusTimeMap: Record<string, string> = {
          'shipped': 'shipped_at',
          'delivered': 'delivered_at'
        };
        
        const updateData: any = { status: nextStatus };
        if (direction === 'next' && statusTimeMap[nextStatus]) {
          updateData[statusTimeMap[nextStatus]] = new Date().toISOString();
        }

        const { error } = await supabase
          .from('kr_quotes')
          .update(updateData)
          .eq('id', id);

        if (error) {
          console.error('Update status error:', error);
        } else {
          await fetchOrders();
        }
    }
  };

  const toggleTaxInvoice = async (id: string, currentVal: boolean) => {
    const updateData: any = { is_tax_issued: !currentVal };
    if (!currentVal) {
      updateData.tax_issued_at = new Date().toISOString();
    } else {
      updateData.tax_issued_at = null;
    }

    const { error } = await supabase
      .from('kr_quotes')
      .update(updateData)
      .eq('id', id);
    
    if (!error) await fetchOrders();
  };

  const togglePayment = async (id: string, currentVal: boolean) => {
    const updateData: any = { is_paid: !currentVal };
    if (!currentVal) {
      updateData.paid_at = new Date().toISOString();
    } else {
      updateData.paid_at = null;
    }

    const { error } = await supabase
      .from('kr_quotes')
      .update(updateData)
      .eq('id', id);
    
    if (!error) await fetchOrders();
  };

  const cancelOrder = async (id: string, reason: string) => {
    if (!reason.trim()) return alert('취소 사유를 반드시 입력해주세요.');
    
    if (window.confirm('정말로 이 주문을 취소하시겠습니까?')) {
      // order_note 앞에 취소 사유를 덧붙여서 기록 (별도 컬럼 없어도 분류 가능하게)
      const currentOrder = orders.find(o => o.id === id);
      const updatedNote = `[취소사유: ${reason}] ${currentOrder?.order_note || ''}`.trim();
      
      // --- [재고 연동 로직] ---
      // 이미 재고가 차감된 상태에서 취소하는 경우 복구
      const deductedStatuses = ['paid', 'shipped', 'tracking_sent', 'delivered'];
      if (currentOrder && deductedStatuses.includes(currentOrder.status)) {
        await updateInventory(currentOrder.items, 'restore');
      }
      // -----------------------
      
      const { error } = await supabase
        .from('kr_quotes')
        .update({ 
          status: 'cancelled',
          order_note: updatedNote
        })
        .eq('id', id);
      
      if (!error) {
        await fetchOrders();
        setSelectedOrderDetail(null);
        setIsCancelling(false);
        setCancelReasonInput('');
      } else {
        alert('취소 처리 중 오류가 발생했습니다: ' + error.message);
      }
    }
  };

  const updateOrderDate = async (id: string, newDate: string) => {
    const { error } = await supabase
      .from('kr_quotes')
      .update({ order_date: newDate })
      .eq('id', id);
    
    if (error) {
      alert('날짜 수정 중 오류가 발생했습니다: ' + error.message);
    } else {
      await fetchOrders();
    }
  };

  const updateEditingOrder = (field: string, value: any) => {
    if (!editingOrder) return;
    setEditingOrder((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateEditingItem = (id: string, field: string, value: any) => {
    if (!editingOrder) return;
    const newItems = editingOrder.items.map((item: any) => {
      if (item.id === id) return { ...item, [field]: value };
      return item;
    });
    setEditingOrder((prev: any) => ({ ...prev, items: newItems }));
  };

  // 상세 모달 내 실시간 계산 로직
  const { totalRetail, itemsSubtotal, shippingFee } = useMemo(() => {
    if (!editingOrder) return { totalRetail: 0, itemsSubtotal: 0, shippingFee: 0 };
    
    // 사용자가 수정하기 전(초기 상태)에는 DB에 저장된 값을 그대로 사용
    // 수정이 발생했다면(items 수량 변화 등) 재계산된 값을 사용
    const retailTotal = editingOrder.items.reduce((sum: number, item: any) => sum + (PRODUCT_XT_FIN.retailPrice * (item.quantity || 1)), 0);
    
    // DB에 이미 저장된 정산 정보가 있다면 우선 사용 (데이터 무결성 유지)
    // 단, itemsSubtotal은 세부 내역 표시를 위해 계산이 필요함
    const effectiveRate = editingOrder.discount_rate || 0;
    const calculatedSubtotal = editingOrder.items.reduce((sum: number, item: any) => {
      const price = item.unitPrice || Math.floor(retailPrice * (1 - effectiveRate / 100));
      return sum + (price * (item.quantity || 1));
    }, 0);

    // 배송비 판단 로직 보강
    const isJejuAddress = editingOrder.shipping_address?.includes('제주');
    const shippingUnit = isJejuAddress ? 8000 : 5000;
    const individualCount = editingOrder.items.filter((item: any) => item.individual_shipping || item.individualShipping).length;
    const calculatedShipping = individualCount > 0 ? (individualCount * shippingUnit) : shippingUnit;

    // 결론: DB에 저장된 값이 있으면 그것을 최우선으로 보여줌 (목록과 일치시키기 위함)
    const finalItemsTotal = editingOrder.total_amount ? (editingOrder.total_amount - (editingOrder.shipping_fee || 0)) : calculatedSubtotal;
    const finalShipping = editingOrder.shipping_fee !== undefined ? editingOrder.shipping_fee : calculatedShipping;
    
    return { 
      totalRetail: retailTotal, 
      itemsSubtotal: finalItemsTotal, 
      shippingFee: finalShipping 
    };
  }, [editingOrder]);

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;
    setIsUpdating(true);
    
    const finalTotal = itemsSubtotal + shippingFee;
    
    // --- [재고 연동 로직] ---
    // 수량이나 품목 수정 시, 이미 재고가 차감된 상태라면 보정작업 수행
    const deductedStatuses = ['paid', 'shipped', 'tracking_sent', 'delivered'];
    if (deductedStatuses.includes(editingOrder.status)) {
      const originalOrder = orders.find(o => o.id === editingOrder.id);
      if (originalOrder) {
        // 기존 수량만큼 다시 채우고, 수정된 수량만큼 다시 뺌 (Restore old -> Deduct new)
        await updateInventory(originalOrder.items, 'restore');
        await updateInventory(editingOrder.items, 'deduct');
      }
    }
    // -----------------------
    
    const orderData = {
      items: editingOrder.items,
      total_amount: finalTotal,
      discount_rate: editingOrder.discount_rate,
      shipping_name: editingOrder.shipping_name,
      shipping_phone: editingOrder.shipping_phone,
      shipping_address: editingOrder.shipping_address,
      order_note: editingOrder.order_note,
      order_date: editingOrder.order_date,
      status: editingOrder.status,
      shipping_fee: shippingFee
    };

    const { error } = await supabase
      .from('kr_quotes')
      .update(orderData)
      .eq('id', editingOrder.id);

    if (error) {
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert('수정 사항이 저장되었습니다.');
      setSelectedOrderDetail(null);
      setEditingOrder(null);
      await fetchOrders();
    }
    setIsUpdating(false);
  };

  const deleteOrder = async (id: string) => {
    const o = orders.find(item => item.id === id);
    const firm = o?.customer?.biz_name || o?.customer?.company_name || '미지정';
    const rcpt = o?.shipping_name || '미지정';
    const amt = o?.total_amount?.toLocaleString() || '0';

    if (window.confirm(`[${firm} | ${rcpt}] 님의 ₩ ${amt} 판매 기록을 영구적으로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      try {
        // 자식 테이블(품목 상세) 먼저 삭제
        await supabase.from('kr_quote_items').delete().eq('quote_id', id);
        
        const { error } = await supabase
          .from('kr_quotes')
          .delete()
          .eq('id', id);
        
        if (!error) {
          await fetchOrders();
          setSelectedOrderDetail(null);
          setEditingOrder(null);
          alert('판매 기록이 영구 삭제되었습니다.');
        } else {
          throw error;
        }
      } catch (err: any) {
        alert('삭제 실패: ' + err.message);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    return STATUS_CONFIG[status] || { label: '알수없음', color: 'bg-slate-50 text-slate-400', icon: Clock };
  };

  const getNextActionLabel = (status: string) => {
    return STATUS_CONFIG[status]?.nextAction || '';
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customer?.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.customer?.biz_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.serial_number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'unpaid' && o.status === 'issued') ||
                          o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-700 max-w-7xl mx-auto pb-12">
      {/* Header Section Compact & Centered (Matched with Inventory) */}
      <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 text-left">
          <div className="bg-[#EEF6FF] p-3 rounded-2xl">
            <ClipboardList className="w-6 h-6 text-[#0064DE]" />
          </div>
          <div>
            <h2 className="text-[28px] font-light tracking-tighter text-[#002561] leading-none">판매대장 및 관리</h2>
            <p className="text-[16px] font-light text-slate-500 mt-1 uppercase tracking-widest leading-none">
              Total {filteredOrders.length} Orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Counts (Mirroring Inventory Stats) */}
          <div className="flex items-center gap-8 border-r border-slate-100 pr-8">
             <div className="flex flex-col items-center">
                <span className="text-[14px] font-light text-slate-600 uppercase tracking-tighter">전체</span>
                <span className="text-[20px] font-light text-[#002561] leading-none mt-1">{orders.length}</span>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[14px] font-light text-slate-600 uppercase tracking-tighter">진행중</span>
                <span className="text-[20px] font-light text-[#0064DE] leading-none mt-1">
                  {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { val: 'all', label: '전체' },
              { val: 'unpaid', label: '미수금' },
              { val: 'issued', label: '견적발행' },
              { val: 'paid', label: '입금완료' },
              { val: 'shipped', label: '발송완료' },
              { val: 'cancelled', label: '취소됨' }
            ].map(({ val, label }) => (
              <button 
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-4 py-2 rounded-xl text-[16px] font-light tracking-tighter transition-all ${
                  statusFilter === val ? 'bg-[#002561] text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="업체명/번호 검색..."
              className="bg-slate-50 rounded-xl pl-10 pr-4 py-2.5 text-[16px] font-light text-[#002561] outline-none focus:bg-white border-2 border-transparent focus:border-[#0064DE]/10 transition-all w-48 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-blue-900/5 overflow-visible relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-[2rem]">
            <div className="w-10 h-10 border-4 border-[#0064DE] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <div className="overflow-visible">
          <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-2 text-left text-[13px] font-light text-[#002561] tracking-tight w-[110px] border-r border-slate-100">일자 / 번호</th>
                  <th className="px-4 py-2 text-left text-[13px] font-light text-[#002561] tracking-tight w-[160px] border-r border-slate-100">업체명</th>
                  <th className="px-4 py-2 text-left text-[13px] font-light text-[#002561] tracking-tight w-[90px] border-r border-slate-100">대표자명</th>
                  <th className="px-4 py-2 text-left text-[13px] font-light text-[#002561] tracking-tight border-r border-slate-100">품목 상세</th>
                  <th className="px-4 py-2 text-left text-[13px] font-light text-[#002561] tracking-tight w-[180px] border-r border-slate-100">수령인</th>
                  <th className="px-4 py-2 text-left text-[13px] font-light text-[#002561] tracking-tight w-[110px] border-r border-slate-100">상태</th>
                  <th className="px-4 py-2 text-center text-[13px] font-light text-[#002561] tracking-tight w-[80px] border-r border-slate-100">결제</th>
                  <th className="px-4 py-2 text-center text-[13px] font-light text-[#002561] tracking-tight w-[80px] border-r border-slate-100">세금계산서</th>
                  <th className="px-4 py-2 text-right text-[13px] font-light text-[#002561] tracking-tight w-[110px] border-r border-slate-100">합계 금액</th>
                  <th className="px-4 py-2 text-center text-[13px] font-light text-[#002561] tracking-tight w-[100px] border-r border-slate-100">단계 변경</th>
                  <th className="px-4 py-2 text-right text-[13px] font-light text-[#002561] tracking-tight pr-6 w-[80px]">관리</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const StatusIcon = badge.icon;
                  const nextAction = getNextActionLabel(order.status);
                  
                   const firstItem = order.items?.[0];
                   const totalQty = order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                   const itemSummary = firstItem 
                     ? `XT핀 ${firstItem.color}/${firstItem.size}${order.items.length > 1 ? ` 등 ${order.items.length}개` : ''} (총 ${totalQty}개)`
                     : '-';
                   
                   // 수령인 요약 로직
                   const individualRecipients = Array.from(new Set(order.items?.map(i => i.individual_shipping?.name).filter(Boolean)));
                   const recipientSummary = individualRecipients.length > 0
                     ? `${individualRecipients[0]}${individualRecipients.length > 1 ? ` 등 ${individualRecipients.length}인` : ''}`
                     : (order.shipping_name || '-');

                   const isCancelled = order.status === 'cancelled';

                  return (
                    <tr 
                      key={order.id} 
                      className={`group hover:bg-blue-50/80 hover:shadow-inner transition-all border-b border-slate-50 last:border-0 cursor-pointer ${isCancelled ? 'opacity-50 grayscale' : ''}`}
                      onClick={() => { 
                        if (order.discount_rate == null) {
                          alert(`[데이터 무결성 에러] 견적번호 ${order.serial_number}\n해당 주문건에 필수 데이터인 할인율(discount_rate)이 비어 있습니다. DB 데이터를 먼저 보강해주세요.`);
                          return;
                        }
                        setSelectedOrderDetail(order); 
                        setEditingOrder(JSON.parse(JSON.stringify(order))); 
                        setIsCancelling(false); 
                      }}
                    >
                      <td className="px-4 py-1.5 border-r border-slate-50" onClick={(e) => { 
                        e.stopPropagation(); 
                        if (order.discount_rate == null) {
                          alert(`[데이터 무결성 에러] 견적번호 ${order.serial_number}\n해당 주문건에 필수 데이터인 할인율(discount_rate)이 비어 있습니다. DB 데이터를 먼저 보강해주세요.`);
                          return;
                        }
                        setSelectedOrderDetail(order); 
                        setEditingOrder(JSON.parse(JSON.stringify(order))); 
                      }}>
                        <div className="flex flex-col text-left">
                          <span className="text-[13px] font-light text-[#002561] tracking-tighter leading-none">
                            {order.order_date ? format(new Date(order.order_date), 'yyyy.MM.dd') : '-'}
                          </span>
                          <span className="text-[11px] font-light text-slate-400 tracking-tighter mt-0.5">
                            {order.serial_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 border-r border-slate-50">
                        <div className="flex items-center gap-1.5 text-left flex-wrap">
                          <span className="text-[13px] font-medium text-[#002561] tracking-tight">
                            {(order.customer?.biz_name || order.customer?.company_name || '정보없음').replace('(공급파트너)', '').trim()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 border-r border-slate-50">
                        <span className="text-[13px] font-light text-[#002561] tracking-tight">
                          {order.customer?.ceo_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 border-r border-slate-50">
                        <div className="flex flex-col text-left">
                           <span className="text-[13px] font-light text-slate-600 tracking-tight leading-none">{itemSummary}</span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 border-r border-slate-50">
                         <span className="text-[13px] font-light text-slate-600 tracking-tighter leading-none">{recipientSummary}</span>
                      </td>
                      <td className="px-4 py-1.5 border-r border-slate-50">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${badge.color.split(' ')[0]} ${badge.color.split(' ')[1]} ring-1 ring-inset shadow-xs whitespace-nowrap shrink-0`}>
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          <span className="text-[11px] font-light tracking-tight uppercase leading-none">{badge.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-center border-r border-slate-50" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => togglePayment(order.id, order.is_paid || false)}
                          className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
                            order.is_paid ? 'bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-500/20' : 'bg-red-50 text-red-500 ring-1 ring-inset ring-red-500/20 hover:bg-red-100 cursor-pointer'
                          } outline-none border-none whitespace-nowrap`}
                        >
                          {order.is_paid ? '입금완료' : '🚨 미수금'}
                        </button>
                      </td>
                      <td className="px-4 py-1.5 text-center border-r border-slate-50" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => toggleTaxInvoice(order.id, order.is_tax_issued)}
                          className={`p-1 rounded-lg transition-all ${
                            order.is_tax_issued ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-200 hover:text-slate-400 outline-none border-none cursor-pointer'
                          }`}
                        >
                          <CheckCircle className={`w-3 h-3 ${order.is_tax_issued ? 'fill-emerald-50' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-1.5 text-right border-r border-slate-50">
                        <span className="text-[13px] font-light text-[#0064DE] tabular-nums">₩ {order.total_amount.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-1.5 border-r border-slate-50" onClick={(e) => e.stopPropagation()}>
                        {STATUS_CONFIG[order.status]?.nextAction && !isCancelled && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, order.status)}
                            className="px-2 py-1 bg-[#002561] text-white text-[11px] font-light rounded-lg hover:bg-[#002561]/90 transition-all flex items-center justify-center gap-0.5 border-none cursor-pointer whitespace-nowrap w-full"
                          >
                            {STATUS_CONFIG[order.status].nextAction}
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-1.5 pr-6 text-right overflow-visible" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === order.id ? null : order.id);
                              }}
                              className={`p-2 rounded-lg transition-all border-none bg-transparent cursor-pointer ${
                                activeMenuId === order.id ? 'bg-slate-100 text-[#002561]' : 'text-slate-300 hover:bg-slate-100 hover:text-[#002561]'
                              }`}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {activeMenuId === order.id && (
                              <div className="absolute right-0 bottom-full bg-white rounded-2xl shadow-xl border border-slate-100 py-2 min-w-[160px] z-[150] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <button onClick={() => { setSelectedOrderDetail(order); setIsCancelling(false); setActiveMenuId(null); }} className="w-full px-4 py-3 text-left text-[14px] font-light text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors group/item border-none bg-transparent cursor-pointer">
                                  <FileText className="w-4 h-4 text-[#0064DE]" />
                                  견적 상세 보기
                                </button>
                                <div className="mx-3 h-[1px] bg-slate-50 my-1" />
                                <button 
                                  onClick={() => { setSelectedOrderDetail(order); setIsCancelling(true); setActiveMenuId(null); }}
                                  className="w-full px-4 py-3 text-left text-[14px] font-light text-red-400 hover:bg-red-50 flex items-center gap-3 transition-colors group/item border-none bg-transparent cursor-pointer"
                                >
                                  <XCircle className="w-4 h-4 text-red-300" />
                                  견적 취소하기
                                </button>
                                <button 
                                  onClick={() => { onEdit?.(order); setActiveMenuId(null); }}
                                  className="w-full px-4 py-3 text-left text-[14px] font-light text-[#002561] hover:bg-slate-50 flex items-center gap-3 transition-colors group/item border-none bg-transparent cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4 text-slate-400 group-hover/item:text-[#0064DE]" />
                                  견적 수정하기 (재발행)
                                </button>
                                {order.status !== 'issued' && !isCancelled && (
                                  <button 
                                    onClick={() => { updateOrderStatus(order.id, order.status, 'prev'); setActiveMenuId(null); }}
                                    className="w-full px-4 py-3 text-left text-[14px] font-light text-slate-500 hover:bg-slate-50 flex items-center gap-3 transition-colors group/item border-none bg-transparent cursor-pointer"
                                  >
                                    <RotateCcw className="w-4 h-4 text-slate-300" />
                                    상태 단계 되돌리기
                                  </button>
                                )}
                                <button 
                                  onClick={() => { handleDownloadPDF(order); setActiveMenuId(null); }}
                                  className="w-full px-4 py-3 text-left text-[14px] font-light text-[#0064DE] hover:bg-blue-50 flex items-center gap-3 transition-colors group/item border-none bg-transparent cursor-pointer"
                                >
                                  <Download className="w-4 h-4 text-[#0064DE]" />
                                  PDF 다운로드
                                </button>
                                <button 
                                  onClick={() => { deleteOrder(order.id); setActiveMenuId(null); }}
                                  className="w-full px-4 py-3 text-left text-[14px] font-light text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors group/item border-none bg-transparent cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                  취소 및 데이터 삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Search className="w-12 h-12" />
                      <p className="text-[20px] font-light tracking-tighter">발행된 견적 내역이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal - Mirroring OrderEntry Layout */}
      {editingOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 text-left">
          <div className="fixed inset-0 bg-[#002561]/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setSelectedOrderDetail(null); setEditingOrder(null); }} />
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-6">
                <div className="bg-white p-3 rounded-[1.5rem] shadow-xl shadow-slate-200/50">
                  <ClipboardList className="w-6 h-6 text-[#0064DE]" />
                </div>
                <div className="text-left">
                  <h3 className="text-[28px] font-light tracking-tighter text-[#002561]">견적 상세 내역 및 수정</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[14px] font-light text-white bg-[#002561] px-2 py-0.5 rounded-md uppercase tracking-tighter">No. {editingOrder.serial_number}</span>
                    <span className="text-[16px] font-light text-[#002561]">{editingOrder.customer?.biz_name || editingOrder.customer?.company_name}</span>
                  </div>
                </div>
              </div>
              
              {/* Status Timeline */}
              <div className="hidden md:flex items-center gap-2 bg-white px-6 py-3 rounded-full border border-slate-100 shadow-sm">
                {['issued', 'paid', 'shipped', 'tracking_sent', 'delivered'].map((step, idx) => {
                  const sequence = ['issued', 'paid', 'shipped', 'tracking_sent', 'delivered'];
                  const currentIdx = sequence.indexOf(editingOrder.status);
                  const isActive = idx <= currentIdx;
                  const labels: {[key:string]:string} = { issued: '발행', paid: '입금', shipped: '발송', tracking_sent: '송장', delivered: '완료' };
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#0064DE] shadow-[0_0_10px_rgba(0,100,222,0.5)]' : 'bg-slate-100'}`} />
                        <span className={`text-[14px] font-light ${isActive ? 'text-[#002561]' : 'text-slate-300'}`}>{labels[step]}</span>
                      </div>
                      {idx < 4 && <div className={`w-8 h-[2px] mb-4 ${idx < currentIdx ? 'bg-[#002561]' : 'bg-slate-50'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              <button onClick={() => { setSelectedOrderDetail(null); setEditingOrder(null); }} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-300 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
              {/* 02 Mirror - 품목 리스트 테이블 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[20px] font-light text-[#0064DE] tracking-tighter ">02</span>
                  <h4 className="text-[16px] font-light text-[#002561] tracking-tight">견적 품목 및 발송지 상세</h4>
                </div>
                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50 text-[14px] font-light text-slate-600 uppercase tracking-widest bg-slate-50/50">
                        <th className="px-6 py-4 text-left w-16">No.</th>
                        <th className="px-6 py-4 text-left">품목 및 옵션</th>
                        <th className="px-6 py-4 text-center w-28">수량</th>
                        <th className="px-6 py-4 text-left">발송 형태</th>
                        <th className="px-6 py-4 text-right w-36 pr-8">금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {editingOrder.items.map((item: any, idx: number) => {
                        const s = item.individual_shipping || item.individualShipping || null;
                        const effectiveRate = editingOrder.discount_rate || 0;
                        // DB에 저장된 단가가 있으면 그것을 사용, 없으면 현재 로직(38만 기준)으로 계산
                        const displayedUnitPrice = item.unitPrice || Math.floor(PRODUCT_XT_FIN.retailPrice * (1 - effectiveRate / 100));
                        
                        return (
                          <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-2 text-[14px] font-light text-slate-500">{(idx + 1).toString().padStart(2, '0')}</td>
                            <td className="px-6 py-2">
                              <div className="flex flex-col text-left">
                                <span className="text-[16px] font-light text-[#002561] tracking-tight">다이브라이트 XT핀</span>
                                <div className="flex gap-2 mt-0.5">
                                  <span className="text-[14px] font-light bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase leading-none">{item.color}</span>
                                  <span className="text-[14px] font-light bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase leading-none">{item.size}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-2">
                              <div className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-0.5 w-24 mx-auto">
                                <button 
                                  onClick={() => updateEditingItem(item.id || idx, 'quantity', Math.max(1, (item.quantity || 1) - 1))}
                                  className="w-6 h-6 flex items-center justify-center text-[#002561] hover:bg-slate-50 rounded font-light border-none bg-transparent cursor-pointer text-[16px]"
                                >-</button>
                                <span className="text-[16px] font-light text-[#002561]">{item.quantity}</span>
                                <button 
                                  onClick={() => updateEditingItem(item.id || idx, 'quantity', (item.quantity || 1) + 1)}
                                  className="w-6 h-6 flex items-center justify-center text-[#002561] hover:bg-slate-50 rounded font-light border-none bg-transparent cursor-pointer text-[16px]"
                                >+</button>
                              </div>
                            </td>
                            <td className="px-6 py-2">
                               <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border ${s ? 'bg-[#EEF6FF] border-[#0064DE]/10 text-[#0064DE]' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                  <Truck className="w-3 h-3 shrink-0" />
                                  <span className="text-[14px] font-light truncate max-w-[180px]">
                                    {s ? `${s.name} | ${s.address}` : '기본 발송지'}
                                  </span>
                                </div>
                            </td>
                            <td className="px-6 py-2 text-right font-light text-[14px] text-[#002561]  pr-8">
                              ₩ {(displayedUnitPrice * (item.quantity || 1)).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 03 Mirror - 발송 및 합계 섹션 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 발송 정보 폼 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <span className="text-[20px] font-medium text-[#0064DE] tracking-tighter ">03</span>
                    <h4 className="text-[16px] font-semibold text-[#002561] tracking-tight">기본 배송지 및 주문 정보</h4>
                  </div>
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[14px] font-medium text-slate-700 ml-1">수령인</label>
                        <input 
                          className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[16px] font-medium text-[#002561] border-none outline-none focus:ring-2 focus:ring-[#0064DE]/20 transition-all"
                          value={editingOrder.shipping_name}
                          onChange={(e) => updateEditingOrder('shipping_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 text-left">
                        <label className="text-[14px] font-medium text-slate-700 ml-1">연락처</label>
                        <input 
                          className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[16px] font-medium text-[#002561] border-none outline-none focus:ring-2 focus:ring-[#0064DE]/20 transition-all"
                          value={editingOrder.shipping_phone}
                          onChange={(e) => updateEditingOrder('shipping_phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[14px] font-medium text-slate-700 ml-1">주소</label>
                      <input 
                        className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[16px] font-medium text-[#002561] border-none outline-none focus:ring-2 focus:ring-[#0064DE]/20 transition-all"
                        value={editingOrder.shipping_address}
                        onChange={(e) => updateEditingOrder('shipping_address', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                       <div className="flex items-center justify-between ml-1 mb-1">
                        <label className="text-[14px] font-medium text-slate-700">주문 날짜</label>
                        <span className="text-[13px] font-medium text-slate-500">거래 일자를 수정하면 장부 순서가 바뀝니다.</span>
                       </div>
                       <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0064DE]" />
                        <input 
                          type="date"
                          className="w-full bg-[#EEF6FF] rounded-xl pl-12 pr-4 py-3.5 text-[16px] font-medium text-[#002561] border-none outline-none"
                          value={editingOrder.order_date ? editingOrder.order_date.split('T')[0] : ''}
                          onChange={(e) => updateEditingOrder('order_date', e.target.value)}
                        />
                       </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[14px] font-medium text-slate-700 ml-1 flex items-center gap-2">
                        내부 관리자 메모 <span className="text-[12px] font-medium text-slate-400">(견적서 미노출)</span>
                      </label>
                      <textarea 
                        placeholder="특이사항을 입력하세요."
                        className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[14px] font-medium text-[#002561] border-none outline-none h-24 resize-none placeholder:text-slate-400"
                        value={editingOrder.order_note || ''}
                        onChange={(e) => updateEditingOrder('order_note', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 가격 정산 요약 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-1 anonymous">
                    <span className="text-[20px] font-medium text-[#0064DE] tracking-tighter opacity-0">03</span>
                    <h4 className="text-[14px] font-medium text-slate-400 tracking-tight">수입/지출 정산 요약</h4>
                  </div>
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl flex flex-col justify-between">
                    <div className="space-y-4 text-left">
                       <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-4">
                           <span className="text-[16px] font-medium text-[#0064DE] tracking-tight">합계 정산</span>
                           <div className="flex items-center gap-2">
                              <span className="text-[14px] font-medium text-slate-700">할인율</span>
                              <input 
                               type="number" 
                               className="w-14 bg-slate-50 rounded-lg px-2 py-1 text-[16px] font-medium text-[#0064DE] text-center border-none outline-none"
                               value={editingOrder.discount_rate ?? TIER_DISCOUNT_MAP[editingOrder.customer?.dealer_tier || ''] ?? 0}
                               onChange={(e) => updateEditingOrder('discount_rate', parseInt(e.target.value) || 0)}
                              />
                              <span className="text-[16px] font-medium text-[#0064DE]">%</span>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <div className="flex justify-between text-[14px] font-medium text-slate-400"><span>총 소비자가 정가 합계</span><span>₩ {totalRetail.toLocaleString()}</span></div>
                           <div className="flex justify-between text-[15px] font-bold text-[#0064DE] bg-blue-50/50 px-3 py-2 rounded-xl mt-1">
                             <span>할인 적용 후 상품 합계 (-{editingOrder.discount_rate ?? TIER_DISCOUNT_MAP[editingOrder.customer?.dealer_tier || ''] ?? 0}%)</span>
                             <span>₩ {itemsSubtotal.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between text-[14px] font-medium text-slate-600"><span>총 발송비</span><span>₩ {shippingFee.toLocaleString()}</span></div>
                           <div className="pt-6 border-t border-slate-50 flex flex-col items-end gap-1">
                              <span className="text-[13px] font-medium text-slate-500 tracking-widest uppercase">최종 합계 금액</span>
                              <span className="text-[24px] font-bold text-[#002561] tracking-tighter leading-none">₩ {(itemsSubtotal + shippingFee).toLocaleString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* 통합 푸터 영역 - 하단 가로 전체 영역 사용 */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-slate-100 gap-4">
                 {/* 왼쪽: 위험/관리 그룹 (subtle) */}
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                    {editingOrder.status !== 'cancelled' && (
                       <button 
                          onClick={() => setIsCancelling(true)}
                          className="px-4 py-2.5 rounded-xl text-[13px] border border-red-200 font-medium text-red-600 hover:bg-red-50 transition-all bg-white cursor-pointer whitespace-nowrap"
                       >견적 취소하기</button>
                    )}
                    <button 
                       onClick={() => editingOrder && deleteOrder(editingOrder.id)}
                       className="px-4 py-2.5 rounded-xl text-[13px] border border-slate-300 font-medium text-slate-600 hover:bg-slate-50 transition-all bg-white cursor-pointer whitespace-nowrap"
                    >영구 삭제하기</button>
                 </div>

                 {/* 오른쪽: 주요 액션 그룹 */}
                 <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
                    <button 
                       onClick={() => editingOrder && handleDownloadPDF(editingOrder)}
                       className="px-4 py-3 rounded-xl text-[14px] font-medium text-[#0064DE] bg-[#EEF6FF] hover:bg-[#DDEBFF] transition-all border-none cursor-pointer flex items-center gap-2 whitespace-nowrap h-11"
                    >
                       <FileDown className="w-4 h-4" />
                       PDF
                    </button>
                    
                    <button 
                       onClick={() => { setSelectedOrderDetail(null); setEditingOrder(null); }}
                       className="px-5 py-3 rounded-xl text-[14px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all border-none cursor-pointer whitespace-nowrap h-11"
                    >닫기</button>

                    {STATUS_CONFIG[editingOrder.status]?.nextAction && (
                       <button 
                          onClick={async () => {
                             await updateOrderStatus(editingOrder.id, editingOrder.status);
                             setEditingOrder((prev: any) => ({ ...prev, status: STATUS_CONFIG[editingOrder.status].nextStatus }));
                          }}
                          className={`px-5 py-3 rounded-xl text-[14px] font-medium text-white shadow-md hover:shadow-lg transition-all border-none cursor-pointer flex items-center gap-2 whitespace-nowrap h-11 ${STATUS_CONFIG[editingOrder.status].color.replace('text-', 'bg-').split(' ')[0]}`}
                       >
                          {STATUS_CONFIG[editingOrder.status].nextAction}
                          <ChevronRight className="w-4 h-4" />
                       </button>
                    )}

                    <button 
                       onClick={handleUpdateOrder}
                       disabled={isUpdating}
                       className="bg-[#002561] text-white px-6 py-3 rounded-xl font-medium text-[14px] shadow-md hover:shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer whitespace-nowrap h-11"
                    >
                       <Save className="w-4 h-4" /> 
                       {isUpdating ? '저장 중...' : '저장'}
                    </button>
                 </div>
              </div>

              {/* 주문 취소 섹션 */}
              {isCancelling && (
                <div className="bg-white rounded-[2rem] p-8 border-2 border-red-100 shadow-xl animate-in zoom-in-95 duration-300 mt-6 box-border">
                  <div className="flex items-center justify-between mb-4 text-left">
                     <h4 className="text-[14px] font-light text-red-500 uppercase tracking-tighter flex items-center gap-2">
                       <AlertCircle className="w-4 h-4" /> 주문 취소 사유 기재
                     </h4>
                     <button onClick={() => setIsCancelling(false)} className="text-[12px] font-light text-slate-300 hover:text-slate-600 border-none bg-transparent cursor-pointer">취소 안함 (돌아가기)</button>
                  </div>
                  <textarea 
                    placeholder="예: 고객 단순 변심, 기한 내 미입금, 상품 품절 등 취소 사유를 입력하세요."
                    className="w-full bg-slate-50 border-none rounded-2xl p-6 text-[14px] font-light text-[#002561] placeholder:text-slate-200 outline-none h-24 mb-4 resize-none"
                    value={cancelReasonInput}
                    onChange={(e) => setCancelReasonInput(e.target.value)}
                  />
                  <button 
                    onClick={() => editingOrder && cancelOrder(editingOrder.id, cancelReasonInput)}
                    className="w-full py-5 bg-red-500 text-white font-light text-[16px] rounded-[1.5rem] shadow-xl shadow-red-900/20 hover:bg-red-600 transition-all border-none cursor-pointer"
                  >
                    취소 확정 및 기록 저장
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
