import fs from 'fs';
import path from 'path';

const orderEntryPath = path.join('/Users/tomo/안티그래비티/gear-quote-app/src/components/tabs/OrderEntry.tsx');
let content = fs.readFileSync(orderEntryPath, 'utf8');

// ==== 1. Type update: isJeju on OrderItem ====
content = content.replace('isTouched: boolean;', 'isTouched: boolean;\n  isJeju?: boolean;');

// ==== 2. State & UI Ref update ====
let hookPattern = /const searchRef = useRef<HTMLDivElement>\(null\);/g;
const newStates = `const searchRef = useRef<HTMLDivElement>(null);
  const smartInputRef = useRef<HTMLTextAreaElement>(null);
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);`;
content = content.replace(hookPattern, newStates);

// ==== 3. KeyDown for Customer Search ====
const inputPattern = /<input\s+type="text" placeholder="사업자 또는 상호명 입력"\s+className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100"\s+value=\{searchTerm\} onChange=\{\(e\) => \{setSearchTerm\(e.target.value\); setShowSearch\(true\);\}\}\s+\/>/g;
const newInput = `<input 
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
                  setSearchActiveIndex(prev => Math.min(prev + 1, customers.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSearchActiveIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter' && searchActiveIndex >= 0) {
                  e.preventDefault();
                  handleCustomerSelect(customers[searchActiveIndex]);
                  setTimeout(() => smartInputRef.current?.focus(), 50);
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  if (customers.length > 0 && searchActiveIndex >= 0) {
                     handleCustomerSelect(customers[searchActiveIndex]);
                  }
                  setTimeout(() => smartInputRef.current?.focus(), 50);
                }
              }}
            />`;
content = content.replace(inputPattern, newInput);

const dropdownMapPattern = /\{customers\.map\(c => \(/g;
const newDropdownMap = `{customers.map((c, i) => (`;

const dropdownItemPattern = /<button key=\{c\.id\} className="w-full px-6 py-4 text-left hover:bg-blue-50 border-b flex justify-between" onClick=\{\(\) => handleCustomerSelect\(c\)\}>/g;
const newDropdownItem = `<button key={c.id} className={\`w-full px-6 py-4 text-left border-b flex justify-between \${searchActiveIndex === i ? 'bg-blue-100' : 'hover:bg-blue-50'}\`} onClick={() => handleCustomerSelect(c)} onMouseEnter={() => setSearchActiveIndex(i)}>`;
content = content.replace(dropdownMapPattern, newDropdownMap);
content = content.replace(dropdownItemPattern, newDropdownItem);

// ==== 4. Jeju Surcharge TotalAmount & Order Save ====
const totalAmountPattern = /const baseShipping = individualCount > 0 \n      \? \(individualCount \* \(shippingUnit \+ jejuExtra\)\) \n      : \(shippingUnit \+ jejuExtra\);\n      \n    return itemsTotal \+ baseShipping;/g;
const newTotalAmount = `const baseShipping = individualCount > 0 
      ? items.reduce((sum, item) => sum + (item.individualShipping ? (shippingUnit + (item.isJeju ? shippingFees.jeju : 0)) : 0), 0)
      : (shippingUnit + jejuExtra);
      
    return itemsTotal + baseShipping;`;
content = content.replace(totalAmountPattern, newTotalAmount);

// Update save payload
const savePayloadPattern = /shipping_fee: \(items\.filter\(item => item\.individualShipping\)\.length \|\| 1\) \* \(shippingFees\.base \+ \(isJeju \? shippingFees\.jeju : 0\)\),/g;
const newSavePayload = `shipping_fee: items.filter(i => i.individualShipping).length > 0 ? items.reduce((sum, item) => sum + (item.individualShipping ? (shippingFees.base + (item.isJeju ? shippingFees.jeju : 0)) : 0), 0) : (shippingFees.base + (isJeju ? shippingFees.jeju : 0)),`;
content = content.replace(savePayloadPattern, newSavePayload);

// Delete the specific old total display
const totalDisplayPattern1 = /<div className="flex justify-between items-center text-slate-300 font-light"><span>상품가<\/span><span>₩ \{\(totalAmount - \(items\.filter\(i => i\.individualShipping\)\.length \|\| 1\) \* \(isJeju \? 8000 : 5000\)\)\.toLocaleString\(\)\}<\/span><\/div>\n                  <div className="flex justify-between items-center text-slate-300 font-light"><span>배송비<\/span><span>₩ \{\(\(items\.filter\(i => i\.individualShipping\)\.length \|\| 1\) \* \(isJeju \? 8000 : 5000\)\)\.toLocaleString\(\)\}<\/span><\/div>/g;

const targetBaseAmt = `(items.filter(i => i.individualShipping).length > 0 ? items.reduce((sum, item) => sum + (item.individualShipping ? (shippingFees.base + (item.isJeju ? shippingFees.jeju : 0)) : 0), 0) : (shippingFees.base + (isJeju ? shippingFees.jeju : 0)))`;
const newDisplay = `<div className="flex justify-between items-center text-slate-300 font-light"><span>상품가</span><span>₩ {(totalAmount - ${targetBaseAmt}).toLocaleString()}</span></div>
                  <div className="flex justify-between items-center text-slate-300 font-light"><span>배송비</span><span>₩ {${targetBaseAmt}.toLocaleString()}</span></div>`;
content = content.replace(totalDisplayPattern1, newDisplay);

// ==== 5. Smart Parsing Logic Update ====
const oldParse = `    if (newItems.length > 0) {
      setItems(newItems);
      // 만약 개별 주소가 없는 품목이 있다면 전역 정보를 사용하도록 함 (또는 마지막 정보를 전역 배송지로 설정)
      if (globalName) setShippingName(globalName);
      if (globalPhone) setShippingPhone(globalPhone);
      if (globalAddress) setShippingAddress(globalAddress);
      
      setSmartInput('');
      alert(\`\${newItems.length}개의 품목 및 정보를 인식했습니다.\`);
    } else {
      alert('품목 정보를 인식하지 못했습니다. 형식을 확인해주세요.');
    }`;
const newParse = `    if (newItems.length > 0) {
      setItems(newItems);
      if (globalName) setShippingName(globalName);
      if (globalPhone) setShippingPhone(globalPhone);
      if (globalAddress) setShippingAddress(globalAddress);
      // alert 안 띄움, 텍스트 유지
    }`;
content = content.replace(oldParse, newParse);

// Update Smart Input Textarea element
const smartTextAreaPattern = /<textarea \n               placeholder="카톡 내용을 복사해서 붙여넣으세요&#10;\(예: 블랙 L 2개, 화이트 S 1개\)"\n               className="w-full bg-white rounded-2xl p-5 flex-1 outline-none resize-none shadow-inner text-\[15px\] leading-relaxed"\n               value=\{smartInput\}\n               onChange=\{\(e\) => setSmartInput\(e\.target\.value\)\}\n             \/>/g;
const newSmartTextArea = `<textarea 
               ref={smartInputRef}
               placeholder="카톡 내용을 복사해서 붙여넣으세요&#10;(예: 블랙 L 2개, 화이트 S 1개)"
               className="w-full bg-white rounded-2xl p-5 flex-1 outline-none resize-none shadow-inner text-[15px] leading-relaxed"
               value={smartInput}
               onChange={(e) => setSmartInput(e.target.value)}
             />`;
content = content.replace(smartTextAreaPattern, newSmartTextArea);

// Button sizing and Smart Input padding
content = content.replace('<div className="bg-amber-400 rounded-3xl p-6 shadow-xl flex flex-col h-full gap-4 flex-1">', '<div className="bg-amber-400 rounded-3xl p-5 shadow-xl flex flex-col h-full gap-3 flex-1">');
content = content.replace('<button \n               onClick={handleSmartInputParse}\n               className="w-full py-5 bg-[#3C3E44] text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-slate-700 transition-all active:scale-[0.98]"\n             >', '<button \n               onClick={handleSmartInputParse}\n               className="w-full py-3 bg-[#3C3E44] text-white rounded-xl font-bold text-base shadow-lg hover:bg-slate-700 transition-all active:scale-[0.98]"\n             >');


// ==== 6. Individual Shipping Toggle ====
const tdPattern = /<td className="relative overflow-visible">/g;
const newTd = `<td className="relative overflow-visible group">`;
content = content.replace(tdPattern, newTd);

const buttonPattern = /\{item\.individualShipping \? \(\n                        <div className="flex gap-2 items-center overflow-hidden">\n                          <span className="font-bold shrink-0">\{item\.individualShipping\.name\}<\/span>\n                          <span className="text-blue-300">\|<\/span>\n                          <span className="font-medium shrink-0">\{item\.individualShipping\.phone\}<\/span>\n                          <span className="text-blue-300">\|<\/span>\n                          <span className="truncate opacity-80">\{item\.individualShipping\.address\}<\/span>\n                        <\/div>\n                      \) : \(\n                        <span className="font-medium">기본 배송지로 발송<\/span>\n                      \)\}/g;

const newButtonInner = `{item.individualShipping ? (
                        <div className="flex w-full justify-between items-center gap-2">
                          <div className="flex gap-2 items-center overflow-hidden">
                            <span className="font-bold shrink-0">{item.individualShipping.name}</span>
                            <span className="text-blue-300">|</span>
                            <span className="font-medium shrink-0">{item.individualShipping.phone}</span>
                            <span className="text-blue-300">|</span>
                            <span className="truncate opacity-80">{item.individualShipping.address}</span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateItem(item.id, 'isJeju', !item.isJeju); }}
                            className={\`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border \${item.isJeju ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}\`}
                          >
                            ✈️ 산간할증 {item.isJeju ? '+3,000' : ''}
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">기본 배송지로 발송</span>
                      )}`;
content = content.replace(buttonPattern, newButtonInner);

// ==== 7. Section 03 & 04 UI and Memo ====
// 03 Section disable logic
// First, find if individual item exists
const hasIndShip = `const hasIndividualShipping = items.some(i => i.individualShipping);`;
// Let's insert it before return
content = content.replace('  return (\n    <div className="p-4 lg:p-6 lg:pt-2 space-y-6 max-w-[1200px] mx-auto">', '  const hasIndividualShipping = items.some(i => i.individualShipping);\n\n  return (\n    <div className="p-4 lg:p-6 lg:pt-2 space-y-6 max-w-[1200px] mx-auto">');

// Replace Title
content = content.replace('<h2 className="text-[20px] font-light tracking-tight">발송자 및 기본지 정보</h2>', '<h2 className="text-[20px] font-light tracking-tight">{hasIndividualShipping ? "개별 배송 우선" : "발송자 및 기본지 정보"}</h2>');

// Add overlay to 03 box
const box03 = `<div className="bg-white rounded-[2rem] border shadow-xl p-6 flex flex-col gap-4 h-full relative">`;
const newBox03 = `<div className={\`bg-white rounded-[2rem] border shadow-xl p-6 flex flex-col gap-4 h-full relative transition-all \${hasIndividualShipping ? 'opacity-40 pointer-events-none' : ''}\`}>
               {hasIndividualShipping && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/50 rounded-[2rem] backdrop-blur-[1px]">
                   <p className="text-lg font-bold text-slate-500 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-200">📦 개별 배송지가 우선 적용 중입니다</p>
                 </div>
               )}`;
content = content.replace(box03, newBox03);

// Remove memo from 03, move to 04
content = content.replace('<textarea placeholder="메모" className="bg-slate-50 border rounded-xl p-4 h-full min-h-[140px] outline-none resize-none" value={orderNote} onChange={e => setOrderNote(e.target.value)} />', '');

// Update 04 layout
const box04Pattern = /<div className="bg-\[#001D4D\] rounded-\[2rem\] p-8 flex flex-col h-full text-white shadow-2xl relative overflow-hidden">/g;
const newBox04 = `<div className="flex flex-col gap-3 h-full">
               <div className="bg-[#001D4D] rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden flex-shrink-0">`;
content = content.replace(box04Pattern, newBox04);

// Button styling update
content = content.replace(/<button \n                     onClick=\{handleReset\}\n                     className="flex items-center justify-center gap-2 py-3 bg-white\/10 hover:bg-white\/20 rounded-2xl text-\[14px\] font-light text-white\/80 transition-all border border-white\/10"\n                   >/g, '<button onClick={handleReset} className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] rounded-xl text-[15px] font-bold text-white transition-all border border-white/20">');
content = content.replace(/<button \n                     className="flex items-center justify-center gap-2 py-3 bg-white\/10 hover:bg-white\/20 rounded-2xl text-\[14px\] font-light text-white\/80 transition-all border border-white\/10"\n                   >/g, '<button className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] rounded-xl text-[15px] font-bold text-white transition-all border border-white/20">');

content = content.replace(/<button onClick=\{handleSaveQuote\} disabled=\{isUpdating\} className="w-full py-6 mt-4 bg-blue-600 rounded-3xl text-\[22px\] font-bold shadow-xl shadow-blue-900\/50 hover:bg-blue-500 active:scale-95 transition-all relative z-10">/g, '<button onClick={handleSaveQuote} disabled={isUpdating} className="w-full py-4 mt-4 bg-blue-600 rounded-2xl text-[18px] font-bold shadow-xl shadow-blue-900/50 hover:bg-blue-500 active:scale-[0.98] transition-all relative z-10">');

// Add Memo box
const endBox04 = `                </button>
            </div>
        </div>`;
const newEndBox04 = `                </button>
               </div>
               {/* Admin Memo */}
               <div className="bg-white border rounded-[2rem] shadow-sm p-5 flex flex-col flex-1">
                 <div className="flex items-center gap-2 mb-3">
                   <FileText className="w-4 h-4 text-slate-400" />
                   <span className="text-[14px] font-bold text-[#002561]">내부 관리자 메모</span>
                   <span className="text-[11px] text-slate-400">(견적서 미노출)</span>
                 </div>
                 <textarea 
                   placeholder="특별 할인, 결제 유의사항 등 내부 메모 작성" 
                   className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 flex-1 outline-none resize-none text-[14px]" 
                   value={orderNote} 
                   onChange={e => setOrderNote(e.target.value)} 
                 />
               </div>
            </div>`;
content = content.replace(endBox04, newEndBox04);

// Replace double newlines parsing to be more robust
const parseBlockPattern = /const lines = smartInput\.split\('\\n'\)\.map\(l => l\.trim\(\)\)\.filter\(l => l\.length > 0\);/g;
const newParseBlock = `const rawText = smartInput;
    // Extract phones
    const phoneRegex = /01[0-9][-.\\s]?[0-9]{3,4}[-.\\s]?[0-9]{4}/g;
    const allPhones = [...rawText.matchAll(phoneRegex)].map(m => m[0]);
    
    // Loosely parse lines
    const lines = rawText.split('\\n').map(l => l.trim()).filter(l => l.length > 0);`;
content = content.replace(parseBlockPattern, newParseBlock);

fs.writeFileSync(orderEntryPath, content);
console.log('Patched OrderEntry.tsx');
