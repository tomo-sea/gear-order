import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { pretendardBase64 } from './fonts';
import { COMPANY_INFO } from '@/constants/company';

export interface OrderItem {
  color: string;
  size: string;
  quantity: number;
  price: number;
  individual_shipping?: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface QuoteData {
  recipientCompany: string;
  items: OrderItem[];
  serialNumber: string;
  shippingInfo?: {
    name: string;
    phone: string;
    address: string;
  };
  orderNote?: string;
  orderDate?: string;
  isJeju?: boolean;
  manualDiscount?: number;
}

export const generateQuotePDF = (data: QuoteData) => {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

  // Fonts
  doc.addFileToVFS('Pretendard-Regular.ttf', pretendardBase64);
  doc.addFont('Pretendard-Regular.ttf', 'Pretendard', 'normal');
  doc.addFont('Pretendard-Regular.ttf', 'Pretendard', 'bold');
  doc.setFont('Pretendard');

  const margin = 20;
  const pageWidth = 210;
  const navyColor = [0, 37, 97]; // #002561
  const lightBlue = [240, 247, 255]; // #F0F7FF
  
  const baseDate = data.orderDate ? new Date(data.orderDate) : new Date();
  const issueDateStr = format(baseDate, 'yyyy.MM.dd');
  const filenameDateStr = format(baseDate, 'yyMMdd');

  // 1. Header Bar (Minimal point)
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Header Section (High Density)
  const headerTopY = 25;
  
  // Left: Title, No, Date
  doc.setFontSize(24);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('Pretendard', 'bold');
  doc.text('견  적  서', margin, headerTopY);

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setFont('Pretendard', 'normal');
  doc.text(`No. ${data.serialNumber}`, margin, headerTopY + 8);
  doc.text(`Date. ${issueDateStr}`, margin, headerTopY + 12.5);

  // Right: Company Info
  const col2X = 110;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('Pretendard', 'bold');
  doc.text(COMPANY_INFO.name, col2X, headerTopY - 1);

  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.setFont('Pretendard', 'normal');
  const providerLines = [
    `사업자번호 : ${COMPANY_INFO.businessNumber}`,
    `대 표 자 : ${COMPANY_INFO.ceo}`,
    `연 락 처 : ${COMPANY_INFO.phone}`,
    `사업장주소 : ${COMPANY_INFO.address}`,
  ];
  providerLines.forEach((line, i) => {
    doc.text(line, col2X, headerTopY + 4 + (i * 4.5));
  });

  // 3. Recipient Info
  const recipientY = 55;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, recipientY - 6, pageWidth - margin, recipientY - 6);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('Pretendard', 'bold');
  doc.text(`${data.recipientCompany || '고객'} 귀중`, margin, recipientY + 2);

  // 4. Calculation Summary (Positioned higher to fill gap)
  const midY = 69;
  const itemsSubtotal = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // 5. Items Table & Shipping Fee Grouping
  const groups: { [key: string]: { info: any, items: any[] } } = {};
  data.items.forEach(item => {
    const s = item.individual_shipping || data.shippingInfo;
    const key = s ? `${s.name}|${s.phone}|${s.address}` : 'default';
    if (!groups[key]) groups[key] = { info: s, items: [] };
    groups[key].items.push(item);
  });

  const shippingFeeTotal = Object.values(groups).reduce((sum, group) => {
    const groupQty = group.items.reduce((acc, item) => acc + item.quantity, 0);
    return sum + (Math.ceil(groupQty / 2) * 5000);
  }, 0) + (data.isJeju ? 3000 : 0);

  const manualDiscount = data.manualDiscount || 0;
  const totalAmount = itemsSubtotal + shippingFeeTotal - manualDiscount;

  doc.setFontSize(10.5);
  doc.setTextColor(50, 50, 50);
  doc.setFont('Pretendard', 'bold');
  doc.text('아래와 같이 견적을 제출합니다.', margin, midY);

  // Highlight Box for Total Amount
  const totalBoxY = midY + 3;
  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.roundedRect(margin, totalBoxY, pageWidth - (margin * 2), 12, 1, 1, 'F');
  
  doc.setFontSize(9.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('총 견적 금액 (부가세 및 발송비 포함)', margin + 8, totalBoxY + 7.5);
  
  doc.setFontSize(13);
  doc.text(`${totalAmount.toLocaleString()} 원`, pageWidth - margin - 8, totalBoxY + 7.5, { align: 'right' });

  // 6. Items Table (High Density)
  const tableBody: any[] = [];
  let globalIndex = 1;
  const groupKeys = Object.keys(groups);
  const isMultiShipping = groupKeys.length > 1;

  groupKeys.forEach((key, groupIdx) => {
    const group = groups[key];
    if (isMultiShipping) {
      // Group Header with better styling
      tableBody.push([{ 
        content: `[배송지 ${groupIdx + 1}] 수령인: ${group.info?.name || '기본'}  |  주소: ${group.info?.address || '정보없음'}`, 
        colSpan: 6, 
        styles: { 
          fillColor: [240, 247, 255], 
          fontStyle: 'bold', 
          textColor: navyColor,
          fontSize: 9,
          padding: 3
        } 
      }]);
    }
    group.items.forEach((item) => {
      const specArr = [item.color, item.size].filter(Boolean);
      const specStr = specArr.length > 0 ? `(${specArr.join(' / ')})` : '';
      tableBody.push([
        (globalIndex++).toString(),
        `다이브라이트 XT핀 ${specStr}`,
        item.quantity.toLocaleString(),
        item.price.toLocaleString(),
        (item.price * item.quantity).toLocaleString(),
        '' // Removed '개별발송' as the header already indicates it
      ]);
    });
    
    // Add a small spacer row between groups if not the last one
    if (isMultiShipping && groupIdx < groupKeys.length - 1) {
      tableBody.push([{ content: '', colSpan: 6, styles: { cellPadding: 1, border: 0 } }]);
    }
  });

  // Shipping Fee Row
  const shippingUnit = data.isJeju && shippingFeeTotal === 8000 ? '8,000' : '5,000';
  tableBody.push([
    { content: `발송료 (${data.isJeju ? '제주 할증' : (isMultiShipping ? `배송지 ${groupKeys.length}곳` : '2개당 5,000원')})`, colSpan: 2, styles: { fillColor: [252, 252, 252], font: 'Pretendard', textColor: [120, 120, 120], halign: 'left' } }, 
    '', // Quantity
    shippingUnit, 
    shippingFeeTotal.toLocaleString(), 
    '-'
  ]);

  if (manualDiscount > 0) {
    tableBody.push([
      { content: '추가할인 (수동 적용)', colSpan: 4, styles: { fillColor: [255, 248, 248], font: 'Pretendard', textColor: [200, 50, 50], halign: 'right', fontStyle: 'bold' } }, 
      { content: `- ${manualDiscount.toLocaleString()}`, colSpan: 1, styles: { fillColor: [255, 248, 248], font: 'Pretendard', textColor: [200, 50, 50], halign: 'right', fontStyle: 'bold' } },
      { content: '-', colSpan: 1, styles: { fillColor: [255, 248, 248] } }
    ]);
  }

  // Combined Shipping Info (ONLY if single shipping, positioned BELOW shipping fee)
  if (!isMultiShipping && data.shippingInfo) {
    const s = data.shippingInfo;
    tableBody.push([
      { content: `▷ 배송지 : ${s.name} / ${s.phone} / ${s.address}`, colSpan: 6, styles: { fillColor: [252, 252, 252], textColor: [100, 100, 100], fontSize: 8.5, fontStyle: 'bold' } }
    ]);
  }

  autoTable(doc, {
    startY: totalBoxY + 17,
    head: [['No.', '품목 및 규격', '수량', '단가', '금액', '비고']],
    body: tableBody,
    theme: 'plain',
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], font: 'Pretendard', fontStyle: 'bold', halign: 'center' },
    styles: { font: 'Pretendard', fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 20 },
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        doc.setDrawColor(242, 242, 242);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    },
    margin: { left: margin, right: margin }
  });

  // 7. Footer / Notes (Compact)
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFont('Pretendard', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('【 특기 사항 】', margin, finalY);
  
  doc.setFont('Pretendard', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const notes = [
    `- 유효 기간: 발행일로부터 7일 이내 (부가세 및 배송비 포함)`,
    `- 입금계좌: ${COMPANY_INFO.bank.name} ${COMPANY_INFO.bank.account} (${COMPANY_INFO.bank.holder})`
  ];
  notes.forEach((note, i) => doc.text(note, margin + 2, finalY + 5 + (i * 4.2)));

  if (data.orderNote) {
    doc.setFont('Pretendard', 'bold');
    doc.text('- 요청사항: ', margin + 2, finalY + 5 + (notes.length * 4.2));
    doc.setFont('Pretendard', 'normal');
    doc.text(data.orderNote, margin + 18, finalY + 5 + (notes.length * 4.2));
  }

    // Save
    const filename = `견적서_${data.recipientCompany || '고객'}_${data.serialNumber}.pdf`;
    doc.save(filename);
  } catch (err: any) {
    console.error('PDF Generation Error:', err);
    alert(`PDF 발행 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}\n브라우저 콘솔 로그를 확인하거나 관리자에게 문의하세요.`);
  }
};
