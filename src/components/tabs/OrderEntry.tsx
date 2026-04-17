'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Plus, 
  Trash2, 
  Save, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Building2,
  Zap,
  RotateCcw,
  FileText,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PRODUCT_XT_FIN } from '@/constants/products';
import { format } from 'date-fns';
import { generateQuotePDF } from '@/utils/pdfGenerator';

interface OrderItem {
  id: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  isTouched: boolean;
  isJeju?: boolean;
  individualShipping?: {
    name: string;
    phone: string;
    address: string;
  };
}

interface Customer {
  id: string;
  company_name: string;
  dealer_tier: string;
  biz_name?: string;
  ceo_name?: string;
  phone?: string;
  address?: string;
  biz_number?: string;
  email?: string;
  instructor_rank?: string;
}

const KOREAN_COLOR_MAP: Record<string, string> = {
  '블랙': 'Black', '검정': 'Black', '검정색': 'Black',
  '블루': 'Blue', '파랑': 'Blue', '파란색': 'Blue',
  '레드': 'Red', '빨강': 'Red', '빨간색': 'Red',
  '오디그린': 'OD Green', '국방': 'OD Green', '그린': 'OD Green',
  '화이트': 'White', '흰색': 'White'
};

const OrderEntry = ({ initialOrder, onClear }: { initialOrder?: any; onClear?: () => void }) => {
  const [retailPrice, setRetailPrice] = useState(PRODUCT_XT_FIN.retailPrice);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [shippingFees, setShippingFees] = useState({ base: 5000, jeju: 3000 });
  const [inventory, setInventory] = useState<any[]>([]);
  const [items, setItems] = useState<OrderItem[]>([
    { id: '1', color: '', size: '', quantity: 1, unitPrice: PRODUCT_XT_FIN.retailPrice, isTouched: false },
    { id: '2', color: '', size: '', quantity: 1, unitPrice: PRODUCT_XT_FIN.retailPrice, isTouched: false }
  ]);
  const [serialNumber, setSerialNumber] = useState('');
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [isManualInput, setIsManualInput] = useState<string | null>(null);
  const [isJeju, setIsJeju] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [smartInput, setSmartInput] = useState('');
  const [tierDiscounts, setTierDiscounts] = useState<Record<string, number>>({
    '공급파트너': 35, '파트너': 35, '다이빙센터': 30, '강사': 20
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const smartInputRef = useRef<HTMLTextAreaElement>(null);
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);
  const [manualDiscount, setManualDiscount] = useState<number>(0);

  const generateNextSerialNumber = async () => {
    const todayStr = format(new Date(), 'yyMMdd');
    const prefix = `QT${todayStr}-`;
    const { data } = await supabase
      .from('kr_quotes')
      .select('serial_number')
      .ilike('serial_number', `${prefix}%`)
      .order('serial_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastSerial = data[0].serial_number;
      const seqStr = lastSerial.split('-')[1];
      const seq = parseInt(seqStr || '0', 10);
      return `${prefix}${(seq + 1).toString().padStart(2, '0')}`;
    }
    return `${prefix}01`;
  };

  useEffect(() => {
    generateNextSerialNumber().then(setSerialNumber);
    
    // DB에서 모든 운영 설정 가져오기
    const fetchAllSettings = async () => {
      const { data } = await supabase
        .from('kr_settings')
        .select('key, value');
        
      if (data) {
        const discMapping: Record<string, number> = {};
        const fees = { base: 5000, jeju: 3000 };
        let rPrice = PRODUCT_XT_FIN.retailPrice;

        data.forEach(item => {
          if (item.key.startsWith('discount_rate_')) {
            const tierName = item.key.replace('discount_rate_', '');
            discMapping[tierName] = parseInt(item.value) || 0;
          }
          if (item.key === 'price_retail_xt_fin') rPrice = parseInt(item.value);
          if (item.key === 'fee_shipping_base') fees.base = parseInt(item.value);
          if (item.key === 'fee_shipping_jeju') fees.jeju = parseInt(item.value);
        });

        setTierDiscounts(prev => ({ ...prev, ...discMapping }));
        setRetailPrice(rPrice);
        setShippingFees(fees);
        
        // 초기 아이템들의 단가도 바뀐 정가로 업데이트
        setItems(prev => prev.map(item => ({ ...item, unitPrice: rPrice })));
      }

      // 재고 정보 별도 로드
      const { data: invData } = await supabase.from('kr_inventory').select('*');
      if (invData) setInventory(invData);
    };
    fetchAllSettings();
  }, []);

  // initialOrder가 들어왔을 때 데이터 매핑
  useEffect(() => {
    if (initialOrder) {
      setCurrentOrderId(initialOrder.id);
      setSerialNumber(initialOrder.serial_number);
      setSelectedCustomer(initialOrder.customer);
      setShippingName(initialOrder.shipping_name || '');
      setShippingPhone(initialOrder.shipping_phone || '');
      setShippingAddress(initialOrder.shipping_address || '');
      setOrderNote(initialOrder.order_note || '');
      setIsJeju(initialOrder.shipping_address?.includes('제주') || false);
      
      // 아이템 복원 및 할인 금액 계산
      if (initialOrder.items && initialOrder.items.length > 0) {
        setItems(initialOrder.items);
        // 첫 번째 아이템에 저장된 수동 할인액 복원
        setManualDiscount(initialOrder.items[0].manualDiscount || 0);
      }
    }
  }, [initialOrder]);

  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const search = async () => {
        const { data } = await supabase
          .from('kr_customers')
          .select('*')
          .or(`company_name.ilike.%${searchTerm}%,biz_name.ilike.%${searchTerm}%,ceo_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(10);
        if (data) setCustomers(data);
      };
      search();
    } else {
      setCustomers([]);
      setShowSearch(false);
    }
  }, [searchTerm]);

  // 외부 클릭 시 검색창 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm('');
    setShowSearch(false);
    setSearchActiveIndex(-1);
    setShippingName(customer.ceo_name || '');
    setShippingPhone(customer.phone || '');
    setShippingAddress(customer.address || '');
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value, isTouched: true } : item));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), color: '', size: '', quantity: 1, unitPrice: retailPrice, isTouched: false }]);
  };

  const removeItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    if (newItems.length === 0) {
      setItems([{ id: Date.now().toString(), color: '', size: '', quantity: 1, unitPrice: retailPrice, isTouched: false }]);
    } else {
      setItems(newItems);
    }
  };

  const discountRate = useMemo(() => {
    if (!selectedCustomer) return 30;
    // DB에 저장된 개별 할인율이 있으면 최우선으로 사용
    if (typeof (selectedCustomer as any).discount_rate === 'number' && (selectedCustomer as any).discount_rate > 0) {
      return (selectedCustomer as any).discount_rate;
    }
    const tier = selectedCustomer.dealer_tier;
    // DB에서 불러온 등급별 매핑 사용, 없으면 기존 하드코딩된 값이라도 사용
    return tierDiscounts[tier] || 30;
  }, [selectedCustomer, tierDiscounts]);

  const discountedUnitPrice = Math.floor(retailPrice * (1 - discountRate / 100));

  const shippingFee = useMemo(() => {
    let totalFee = 0;
    let baseQty = 0;
    let individualFees = 0;

    items.forEach(item => {
      const qty = item.quantity || 1;
      if (item.individualShipping) {
        const boxes = Math.ceil(qty / 2);
        individualFees += boxes * (shippingFees.base + (item.isJeju ? shippingFees.jeju : 0));
      } else {
        baseQty += qty;
      }
    });

    if (baseQty > 0) {
      const baseBoxes = Math.ceil(baseQty / 2);
      totalFee += baseBoxes * (shippingFees.base + (isJeju ? shippingFees.jeju : 0));
    }

    return totalFee + individualFees;
  }, [items, isJeju, shippingFees]);

  const totalAmount = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => sum + (discountedUnitPrice * item.quantity), 0);
    return Math.max(0, itemsTotal + shippingFee - manualDiscount);
  }, [items, discountedUnitPrice, shippingFee, manualDiscount]);

  const getStockInfo = (color: string, size: string) => {
    if (!color || !size) return null;
    // XT핀 [색상한글] [사이즈] 형식으로 매칭 시도
    const colorKr = Object.entries(KOREAN_COLOR_MAP).find(([kr, en]) => en === color)?.[0] || color;
    const searchDesc = `XT핀 ${colorKr} ${size}`;
    return inventory.find(inv => inv.product_desc.includes(colorKr) && inv.product_desc.includes(size));
  };

  const addressSuggestions = useMemo(() => {
    const list: any[] = [];
    if (shippingName && shippingAddress) list.push({ name: shippingName, phone: shippingPhone, address: shippingAddress });
    items.forEach(item => {
      if (item.individualShipping) list.push({ ...item.individualShipping });
    });
    const unique: any[] = [];
    const seen = new Set();
    list.forEach(a => {
      const key = `${a.name}${a.address}`.replace(/\s/g, '');
      if (!seen.has(key)) { seen.add(key); unique.push(a); }
    });
    return unique;
  }, [shippingName, shippingPhone, shippingAddress, items]);

  const handleSmartInputParse = async () => {
    if (!smartInput.trim()) return;
    
    const lines = smartInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // 1. 거래처 자동 검색 (첫 번째 줄)
    const possibleCustomerName = lines[0];
    const { data: customerData } = await supabase
      .from('kr_customers')
      .select('*')
      .or(`company_name.ilike.%${possibleCustomerName}%,biz_name.ilike.%${possibleCustomerName}%`)
      .limit(1)
      .single();

    if (customerData) {
      handleCustomerSelect(customerData);
    }

    // 2. 블록 단위 파싱 (품목 + 배송지 정보 그룹화)
    const newItems: OrderItem[] = [];
    let currentItem: any = null;
    let globalAddress = '';
    let globalName = '';
    let globalPhone = '';
    let addressCount = 0;
    let phoneCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 품목 라인 판별 (XT핀, 색상, 사이즈 중 하나라도 포함된 경우)
      const hasColor = Object.keys(KOREAN_COLOR_MAP).some(k => line.includes(k)) || 
                       PRODUCT_XT_FIN.options.colors.some(c => line.toLowerCase().includes(c.toLowerCase()));
      const hasSize = PRODUCT_XT_FIN.options.sizes.some(s => line.toUpperCase().includes(s.toUpperCase()));
      const isProductLine = line.includes('XT') || (hasColor && hasSize);

      if (isProductLine) {
        // 새로운 품목 시작
        let color = '';
        let size = '';
        let quantity = 1;

        // 색상 추출 (한글 우선)
        Object.entries(KOREAN_COLOR_MAP).forEach(([k, v]) => { if (line.includes(k)) color = v; });
        if (!color) PRODUCT_XT_FIN.options.colors.forEach(c => { if (line.toLowerCase().includes(c.toLowerCase())) color = c; });

        // 사이즈 추출
        PRODUCT_XT_FIN.options.sizes.forEach(s => { if (line.toUpperCase().includes(s.toUpperCase())) size = s; });

        // 수량 추출
        const qtyMatch = line.match(/(\d+)\s*(개|세트|벌|명|ea|EA)?/);
        if (qtyMatch) quantity = parseInt(qtyMatch[1]);

        currentItem = {
          id: Math.random().toString(36).substr(2, 9),
          color, size, quantity,
          unitPrice: discountedUnitPrice,
          isTouched: true
        };
        newItems.push(currentItem);
      } else if (currentItem || i > 0) {
        // 품목 아래에 오는 정보들 (연락처, 주소, 수령인) 파싱
        const phoneMatch = line.match(/01[0-9][-.\s]?[0-9]{3,4}[-.\s]?[0-9]{4}/);
        const isAddress = line.includes('시 ') || line.includes('도 ') || line.includes('구 ') || line.includes('동 ') || line.match(/[가-힣]+길\s*\d+/);
        
        if (phoneMatch) {
          if (currentItem) currentItem.individualShipping = { ...currentItem.individualShipping, phone: phoneMatch[0] };
          globalPhone = phoneMatch[0];
          phoneCount++;
        }
        
        if (isAddress) {
          // 전화번호가 같이 있었다면 주소에서 전화번호 부분은 제거
          const addressText = line.replace(phoneMatch ? phoneMatch[0] : '', '').replace(/^[\s\/|-]+|[\s\/|-]+$/g, '').trim();
          if (currentItem) currentItem.individualShipping = { ...currentItem.individualShipping, address: addressText || line };
          globalAddress = addressText || line;
          
          if (line.includes('제주')) {
            if (currentItem) currentItem.isJeju = true;
            setIsJeju(true);
          }
          addressCount++;
        }
        
        // 이름 추출: 한 줄에 슬래시 등으로 묶여있거나, 짧은 문자열인 경우
        if (phoneMatch || isAddress) {
          const nameMatch = line.split(/[\/|]/)[0].trim();
          if (nameMatch.length >= 2 && nameMatch.length <= 10) {
             if (currentItem) currentItem.individualShipping = { ...currentItem.individualShipping, name: nameMatch };
             globalName = nameMatch;
          }
        } else if (line.length >= 2 && line.length <= 4 && !line.includes('선불') && !line.includes('착불')) {
          if (currentItem) currentItem.individualShipping = { ...currentItem.individualShipping, name: line };
          globalName = line;
        }
      }
    }

    if (newItems.length > 0) {
      if (addressCount <= 1 && phoneCount <= 1) {
        newItems.forEach(item => { delete item.individualShipping; });
      }
      setItems(newItems);
      // 만약 개별 주소가 없는 품목이 있다면 전역 정보를 사용하도록 함
      if (globalName) setShippingName(globalName);
      if (globalPhone) setShippingPhone(globalPhone);
      if (globalAddress) setShippingAddress(globalAddress);
      
      // 팝업 제거 및 원본 텍스트 유지 (UX 개선)
    }
  };

  const handleReset = () => {
    if (!confirm('입력된 모든 내용을 초기화하시겠습니까?')) return;
    setItems([{ id: '1', color: '', size: '', quantity: 1, unitPrice: PRODUCT_XT_FIN.retailPrice, isTouched: false }]);
    setSelectedCustomer(null);
    setCurrentOrderId(null);
    setSearchTerm('');
    setShippingName('');
    setShippingPhone('');
    setShippingAddress('');
    setOrderNote('');
    setSmartInput('');
    setIsJeju(false);
    setManualDiscount(0);
    generateNextSerialNumber().then(setSerialNumber);
    onClear?.();
  };

  const handleManualShippingSubmit = (itemId: string) => {
    if (!manualName || !manualPhone || !manualAddress) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    updateItem(itemId, 'individualShipping', { name: manualName, phone: manualPhone, address: manualAddress });
    setActivePopover(null);
    setIsManualInput(null);
    setManualName(''); setManualPhone(''); setManualAddress('');
  };

  const handleGeneratePDF = async () => {
    if (!selectedCustomer) return alert('거래처를 선택해주세요.');
    const validItems = items.filter(i => i.isTouched && i.color && i.size);
    if (!validItems.length) return alert('품목을 올바르게 선택해주세요.');

    // 묻지 않고 즉시 최신본 저장 후 PDF 발행 (데이터 무결성 확보)
    const saved = await handleSaveQuote(true); 
    if (saved) {
      generateQuotePDF({
        recipientCompany: selectedCustomer.company_name || selectedCustomer.ceo_name || '고객',
        items: validItems.map(item => ({
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: discountedUnitPrice,
          individual_shipping: item.individualShipping
        })),
        serialNumber,
        shippingInfo: shippingName ? {
          name: shippingName,
          phone: shippingPhone,
          address: shippingAddress
        } : undefined,
        orderNote,
        orderDate: initialOrder ? initialOrder.order_date : new Date().toISOString(),
        isJeju,
        manualDiscount
      });
    }
  };

  const handleSaveQuote = async (silentMode = false): Promise<boolean> => {
    if (!selectedCustomer) {
      alert('거래처를 선택해주세요.');
      return false;
    }
    const validItems = items.filter(i => i.isTouched && i.color && i.size);
    if (!validItems.length) {
      alert('품목을 올바르게 선택해주세요.');
      return false;
    }

    // 재고 체크 (방어 시스템)
    const outOfStock = validItems.find(item => {
      const stock = getStockInfo(item.color, item.size);
      return !stock || stock.available_qty < item.quantity;
    });

    if (outOfStock) {
      const stock = getStockInfo(outOfStock.color, outOfStock.size);
      alert(`[재고 부족] ${outOfStock.color} ${outOfStock.size} 품목의 재고가 부족합니다. (현재 가용: ${stock?.available_qty || 0}개)`);
      return false;
    }

    setIsUpdating(true);
    try {
      // 1. 기존 주문이면 번호를 고정하고, 신규면 새로 채번
      const finalSerialNumber = currentOrderId ? serialNumber : await generateNextSerialNumber();
      
      const quoteData: any = {
        customer_id: selectedCustomer.id,
        serial_number: finalSerialNumber,
        // 하위 호환성을 위해 뭉텅이 데이터도 당분간 유지
        items: validItems.map((item, idx) => ({
          ...item,
          unitPrice: discountedUnitPrice,
          manualDiscount: idx === 0 ? manualDiscount : 0
        })),
        total_amount: totalAmount,
        shipping_fee: shippingFee,
        shipping_name: shippingName,
        shipping_phone: shippingPhone,
        shipping_address: shippingAddress,
        order_note: orderNote,
        discount_rate: discountRate,
        order_date: initialOrder ? initialOrder.order_date : new Date().toISOString()
      };

      if (!currentOrderId) {
        quoteData.status = 'issued';
      }

      // 2. 부모 테이블(kr_quotes) 저장
      let quoteResponse;
      if (currentOrderId) {
        quoteResponse = await supabase.from('kr_quotes').update(quoteData).eq('id', currentOrderId).select();
      } else {
        quoteResponse = await supabase.from('kr_quotes').insert(quoteData).select();
      }
      
      if (quoteResponse.error) throw quoteResponse.error;
      const savedQuote = quoteResponse.data[0];
      const quoteId = savedQuote.id;

      // 3. 자식 테이블(kr_quote_items) 저장 (기존 내역 삭제 후 재생성 - Upsert 정석)
      if (currentOrderId) {
        await supabase.from('kr_quote_items').delete().eq('quote_id', quoteId);
      }

      const quoteItemsToInsert = validItems.map((item, idx) => ({
        quote_id: quoteId,
        product_name: '다이브라이트 XT핀',
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        retail_price: retailPrice,
        discount_rate: discountRate,
        final_price: discountedUnitPrice,
        row_total: discountedUnitPrice * item.quantity - (idx === 0 ? manualDiscount : 0),
        individual_shipping: item.individualShipping || null,
        sort_order: idx
      }));

      const { error: itemsError } = await supabase.from('kr_quote_items').insert(quoteItemsToInsert);
      if (itemsError) throw itemsError;
      
      setSerialNumber(finalSerialNumber);
      if (!silentMode) {
        alert(currentOrderId ? '수정 사항이 저장되었습니다.' : '새 주문이 저장되었습니다.');
      }
      
      // 신규 저장 시, 현재 보고 있는 견적을 '방금 저장된 견적'으로 인식하게 하여 
      // 번호를 고정하고 이어서 수정할 수 있게 만듭니다.
      if (!currentOrderId) {
        setCurrentOrderId(quoteId);
      }
      return true;
    } catch (e: any) { 
      alert('저장 실패: ' + e.message); 
      return false;
    } finally { 
      setIsUpdating(false); 
    }
  };

  const hasIndividualShipping = items.some(i => i.individualShipping);

  return (
    <div className="p-4 lg:p-6 lg:pt-2 space-y-6 max-w-[1200px] mx-auto">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border shadow-sm mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl ${currentOrderId ? 'bg-amber-50' : 'bg-blue-50'}`}>
            <FileText className={`w-5 h-5 ${currentOrderId ? 'text-amber-500' : 'text-blue-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {currentOrderId ? '기본 견적 관리' : '임시 견적 발행 (저장 전)'}
              </span>
              {currentOrderId && (
                <span className="bg-blue-50 text-[#0064DE] text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">Verified Source</span>
              )}
            </div>
            <p className="text-[22px] font-bold text-[#002561] tracking-tighter leading-none mt-2">
               <span className={`px-2 py-0.5 rounded-xl tabular-nums ${currentOrderId ? 'bg-blue-50 text-[#0064DE]' : 'bg-slate-50 text-slate-400'}`}>
                 {serialNumber || '생성 중...'}
               </span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {currentOrderId && (
             <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-slate-400 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer">
               <RotateCcw className="w-4 h-4" /> 수정을 취소하고 새로 작성
             </button>
          )}
          <div className="w-[1px] h-4 bg-slate-100 mx-2" />
          <button onClick={handleReset} className="p-2.5 bg-slate-50 text-slate-400 hover:text-[#002561] hover:bg-slate-100 rounded-xl transition-all border-none cursor-pointer">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* 거래처 선택 */}
        <div className="lg:w-[55%] relative z-[100] flex flex-col" ref={searchRef}>
          <div className="flex items-center gap-3 mb-2 px-1 text-[#002561]">
            <span className="text-[20px] font-medium tracking-tighter">01</span>
            <h2 className="text-[20px] font-light tracking-tight">거래처 검색</h2>
          </div>
          <div className="bg-white rounded-3xl border shadow-xl p-4 flex-1">
            <div className="relative">
              <input 
                type="text" placeholder="사업자 또는 상호명 입력" 
                className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100" 
                value={searchTerm} 
                onChange={(e) => {
                  setSearchTerm(e.target.value); 
                  setShowSearch(true);
                  setSearchActiveIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setShowSearch(true);
                    setSearchActiveIndex(prev => Math.min(prev + 1, customers.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchActiveIndex(prev => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchActiveIndex >= 0 && customers[searchActiveIndex]) {
                      handleCustomerSelect(customers[searchActiveIndex]);
                      setTimeout(() => smartInputRef.current?.focus(), 50);
                    }
                  } else if (e.key === 'Tab') {
                    if (customers.length > 0 && searchActiveIndex >= 0) {
                       handleCustomerSelect(customers[searchActiveIndex]);
                    }
                    setTimeout(() => smartInputRef.current?.focus(), 50);
                  } else if (e.key === 'Escape') {
                    setShowSearch(false);
                  }
                }}
              />
              {showSearch && customers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border z-[200] overflow-hidden max-h-[300px] overflow-y-auto">
                  {customers.map((c, i) => (
                    <button key={c.id} onMouseEnter={() => setSearchActiveIndex(i)} className={`w-full px-6 py-4 text-left border-b flex justify-between transition-colors ${searchActiveIndex === i ? 'bg-blue-100' : 'hover:bg-blue-50'}`} onClick={() => handleCustomerSelect(c)}>
                      <span className="font-medium">{c.biz_name || c.company_name}</span>
                      <span className="text-slate-400 text-sm">{c.ceo_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="mt-4 p-5 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[20px] font-bold text-[#002561]">{selectedCustomer.biz_name || selectedCustomer.company_name}</p>
                    <p className="text-[14px] text-[#002561]/60 font-medium">데스크 명칭: {selectedCustomer.company_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-white px-3 py-1 rounded-full border border-blue-200 text-[12px] font-extrabold text-[#002561]">
                      할인율 {discountRate}%
                    </div>
                    <div className="bg-[#002561] px-3 py-1 rounded-full text-[12px] font-bold text-white shrink-0">
                      {selectedCustomer.dealer_tier}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 text-[13px] text-slate-600 border-t border-blue-100 pt-3">
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-16">대표자</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.ceo_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-16">연락처</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.biz_number && (
                    <div className="flex gap-2">
                      <span className="text-slate-400 w-16">사업자번호</span>
                      <span className="font-medium text-slate-800">{selectedCustomer.biz_number}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-16">등급/랭크</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.dealer_tier || selectedCustomer.instructor_rank || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[13px] text-slate-600 border-t border-blue-100 pt-3">
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-16">이메일</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-16">주소</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.address}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI 입력창 */}
        <div className="w-full lg:w-[45%] flex flex-col min-h-[360px]">
          <div className="flex items-center gap-3 mb-2 px-1 text-[#002561]">
             <span className="text-[20px] font-medium tracking-tighter">00</span>
             <h2 className="text-[20px] font-light tracking-tight">스마트 한방 견적</h2>
          </div>
          <div className="bg-amber-400 rounded-3xl p-5 shadow-xl flex flex-col h-full gap-3 flex-1">
             <textarea 
               ref={smartInputRef}
               placeholder="카톡 내용을 복사해서 붙여넣으세요&#10;(예: 블랙 L 2개, 화이트 S 1개)"
               className="w-full bg-white rounded-2xl p-5 flex-1 outline-none resize-none shadow-inner text-[15px] leading-relaxed"
               value={smartInput}
               onChange={(e) => setSmartInput(e.target.value)}
             />
             <button 
               onClick={handleSmartInputParse}
               className="w-full py-3 bg-[#3C3E44] text-white rounded-xl font-bold text-base shadow-lg hover:bg-slate-700 transition-all active:scale-[0.98]"
             >
               견적서 자동 생성
             </button>
          </div>
        </div>
      </div>

      {/* 품목 리스트 */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-2 px-1 text-[#002561]">
          <span className="text-[20px] font-medium tracking-tighter">02</span>
          <h2 className="text-[20px] font-light tracking-tight">품목 상세정보</h2>
        </div>
        <div className="bg-white rounded-3xl border shadow-xl overflow-visible">
          <table className="w-full">
            <thead className="bg-[#002561] text-white">
              <tr className="text-sm">
                <th className="py-4 w-12 text-center">No</th>
                <th className="w-[80px] text-center">색상</th>
                <th className="w-[80px] text-center">사이즈</th>
                <th className="w-24 text-center">수량</th>
                <th className="text-left pl-2">배송지 설정 (개별 발송 시 주소 표시)</th>
                <th className="w-32 text-right pr-6">금액</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50 relative">
                  <td className="py-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                   <td className="px-1 text-center">
                    <div className="flex flex-col items-center">
                      <select value={item.color} onChange={e => updateItem(item.id, 'color', e.target.value)} className="w-full max-w-[70px] border rounded py-1 px-1 text-sm text-center bg-white">
                        <option value="">색상</option>
                        {PRODUCT_XT_FIN.options.colors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-1 text-center">
                    <div className="flex flex-col items-center">
                      <select value={item.size} onChange={e => updateItem(item.id, 'size', e.target.value)} className="w-full max-w-[70px] border rounded py-1 px-1 text-sm text-center bg-white">
                        <option value="">사이즈</option>
                        {PRODUCT_XT_FIN.options.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-1">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center border rounded max-w-[75px] bg-white">
                        <button onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} className="w-6 text-slate-400 hover:text-blue-500">-</button>
                        <input type="number" value={item.quantity} className="w-8 text-center text-sm font-bold text-[#002561]" readOnly />
                        <button onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)} className="w-6 text-slate-400 hover:text-blue-500">+</button>
                      </div>
                      {item.color && item.size && (() => {
                        const stock = getStockInfo(item.color, item.size);
                        const isShort = !stock || stock.available_qty < item.quantity;
                        return (
                          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${isShort ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                            {isShort ? <AlertCircle className="w-2.5 h-2.5" /> : null}
                            재고 {stock?.available_qty || 0}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="relative overflow-visible">
                    <div className="flex items-center w-full gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === item.id ? null : item.id); setIsManualInput(null); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] transition-all flex-1 text-left ${item.individualShipping ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${item.individualShipping ? 'text-blue-500' : 'text-slate-300'}`} />
                        {item.individualShipping ? (
                          <div className="flex gap-2 items-center overflow-hidden">
                            <span className="font-bold shrink-0">{item.individualShipping.name}</span>
                            <span className="text-blue-300">|</span>
                            <span className="font-medium shrink-0">{item.individualShipping.phone}</span>
                            <span className="text-blue-300">|</span>
                            <span className="truncate opacity-80">{item.individualShipping.address}</span>
                          </div>
                        ) : (
                          <span className="font-medium">기본 배송지로 발송</span>
                        )}
                      </button>
                      {item.individualShipping && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateItem(item.id, 'isJeju', !item.isJeju); }}
                          className={`shrink-0 px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${item.isJeju ? 'bg-amber-100 text-amber-600 border-amber-300 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                        >
                          ✈️ 도서산간 {item.isJeju ? '+3,000' : ''}
                        </button>
                      )}
                    </div>
                    {activePopover === item.id && (
                      <div 
                        className="fixed lg:absolute mt-2 w-72 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border p-5 z-[99999]" 
                        onMouseDown={e => e.stopPropagation()}
                      >
                         {!isManualInput ? (
                           <div className="space-y-2">
                              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                                <p className="text-[14px] font-bold text-[#002561]">배송지 선택</p>
                                <button onClick={() => setActivePopover(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <button onClick={() => { updateItem(item.id, 'individualShipping', undefined); setActivePopover(null); }} className="w-full text-left py-3 px-4 rounded-xl hover:bg-slate-50 border text-sm font-bold">기본 배송지 사용</button>
                              {addressSuggestions.map((addr, i) => (
                                <button key={i} onClick={() => { updateItem(item.id, 'individualShipping', addr); setActivePopover(null); }} className="w-full text-left py-3 px-4 rounded-xl hover:bg-slate-50 border text-sm">
                                  <div className="font-bold">{addr.name}</div>
                                  <div className="text-[11px] text-slate-500 truncate">{addr.address}</div>
                                </button>
                              ))}
                              <button onClick={() => setIsManualInput(item.id)} className="w-full py-4 mt-2 bg-blue-50 text-blue-600 rounded-2xl text-sm font-bold border border-dashed border-blue-200">+ 주소 직접 입력</button>
                           </div>
                         ) : (
                           <div className="space-y-3">
                              <div className="flex items-center justify-between border-b pb-2 mb-2">
                                <span className="text-sm font-bold text-[#002561]">새 배송지 입력</span>
                                <button onClick={() => setIsManualInput(null)}><X className="w-4 h-4 text-slate-400" /></button>
                              </div>
                              <input placeholder="수령인" className="w-full border rounded-xl px-4 py-3 text-sm" value={manualName} onChange={e => setManualName(e.target.value)} />
                              <input placeholder="연락처" className="w-full border rounded-xl px-4 py-3 text-sm" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                              <textarea placeholder="정확한 주소" className="w-full border rounded-xl px-4 py-3 text-sm h-24 resize-none" value={manualAddress} onChange={e => setManualAddress(e.target.value)} />
                              <div className="flex gap-2">
                                <button onClick={() => setActivePopover(null)} className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-bold">취소</button>
                                <button onClick={() => handleManualShippingSubmit(item.id)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200">적용</button>
                              </div>
                           </div>
                         )}
                      </div>
                    )}
                  </td>
                  <td className="text-right pr-6 font-medium text-[#002561]">₩ {(discountedUnitPrice * item.quantity).toLocaleString()}</td>
                  <td className="text-center pr-2"><button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="w-full py-5 text-slate-400 hover:text-blue-600 border-t border-dashed transition-all" onClick={addItem}>+ 새로운 품목 추가</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 pb-20">
        {/* 기본 배송지 */}
        <div className="flex-[1.2] flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2 px-1 text-[#002561]">
              <span className="text-[20px] font-medium tracking-tighter">03</span>
              <h2 className="text-[20px] font-light tracking-tight">{hasIndividualShipping ? "우선 배송지 적용 중" : "발송자 및 기본지 정보"}</h2>
            </div>
            <div className={`bg-white rounded-[2rem] border shadow-xl p-5 flex flex-col gap-3 relative transition-all ${hasIndividualShipping ? 'opacity-40 pointer-events-none' : ''}`}>
               {hasIndividualShipping && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/50 rounded-[2rem] backdrop-blur-[1px]">
                   <p className="text-[15px] font-bold text-slate-500 bg-white px-6 py-3 rounded-full shadow-lg border border-slate-200">📦 개별 배송지가 우선 적용 중입니다</p>
                 </div>
               )}
               <div className="flex justify-end mb-1">
                 <button 
                   onClick={() => setIsJeju(!isJeju)}
                   className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1.5 ${isJeju ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                 >
                   <Zap className={`w-3 h-3 ${isJeju ? 'fill-amber-500 text-amber-500' : ''}`} />
                   제주/도서산간 할증 {isJeju ? '+3,000' : '미적용'}
                 </button>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <input placeholder="성함" className="bg-slate-50 border rounded-xl px-4 py-3 outline-none" value={shippingName} onChange={e => setShippingName(e.target.value)} />
                  <input placeholder="연락처" className="bg-slate-50 border rounded-xl px-4 py-3 outline-none" value={shippingPhone} onChange={e => setShippingPhone(e.target.value)} />
               </div>
               <input placeholder="주소" className="bg-slate-50 border rounded-xl px-4 py-3 outline-none" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} />
            </div>
        </div>

        {/* 결제 요약 */}
        <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2 px-1 text-[#002561]">
              <span className="text-[20px] font-medium tracking-tighter">04</span>
              <h2 className="text-[20px] font-light tracking-tight">최종 견적 금액</h2>
            </div>
            <div className="flex flex-col h-full gap-3">
              <div className="bg-[#001D4D] rounded-[2rem] p-6 flex flex-col text-white shadow-2xl relative overflow-hidden flex-shrink-0">
                 <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Zap className="w-40 h-40" /></div>
                 <div className="flex-1 flex flex-col justify-center gap-3 relative z-10">
                    <div className="flex justify-between items-center text-white font-medium text-[15px]"><span>상품가</span><span>₩ {(totalAmount - shippingFee + manualDiscount).toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-white font-medium text-[15px]"><span>배송비</span><span>₩ {shippingFee.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-white font-medium text-[15px] pt-2">
                      <span>추가 할인</span>
                      <div className="flex items-center gap-2">
                         <span>- ₩</span>
                         <input 
                           type="number" 
                           value={manualDiscount || ''} 
                           onChange={e => setManualDiscount(Number(e.target.value))}
                           placeholder="0"
                           className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 w-24 text-right text-amber-200 outline-none focus:bg-white/20 transition-all font-bold" 
                         />
                      </div>
                    </div>
                  <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-end">
                      <span className="text-[15px] font-light pb-1">합계</span>
                      <span className="text-[32px] font-bold text-amber-400 tabular-nums leading-none">₩ {totalAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-5 relative z-10 text-[14px]">
                     <button 
                       onClick={handleReset}
                       className="flex items-center justify-center gap-2 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-white transition-all shadow-sm"
                     >
                       <RotateCcw className="w-4 h-4" />
                       초기화
                     </button>
                     <button 
                       onClick={handleGeneratePDF}
                       className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-light text-white/80 transition-all border border-white/10"
                     >
                       <FileText className="w-4 h-4" />
                       PDF
                     </button>
                     <button onClick={() => handleSaveQuote()} disabled={isUpdating} className="flex items-center justify-center gap-2 py-3 bg-blue-600 rounded-xl font-bold shadow-xl shadow-blue-900/50 hover:bg-blue-500 active:scale-[0.98] transition-all relative z-10">
                        {isUpdating ? <RotateCcw className="w-4 h-4 animate-spin" /> : '저장'}
                     </button>
                  </div>
                 </div>
              </div>
              
              {/* 내부 관리자 메모 */}
              <div className="bg-white border rounded-[2rem] shadow-sm p-5 flex flex-col flex-1 min-h-[140px]">
                <div className="flex items-center gap-2 mb-3 px-1 text-[#002561]">
                  <FileText className="w-4 h-4 opacity-50" />
                  <span className="text-[14px] font-bold">내부 관리자 메모</span>
                  <span className="text-[12px] font-medium text-slate-400">(견적서 미노출)</span>
                </div>
                <textarea 
                  placeholder="특이사항을 입력하세요." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 flex-1 outline-none resize-none text-[14px]" 
                  value={orderNote} 
                  onChange={e => setOrderNote(e.target.value)} 
                />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrderEntry;
