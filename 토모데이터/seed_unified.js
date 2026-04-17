const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedUnified() {
  const dataDir = '토모데이터';
  // 한글 자소 분리(NFD) 문제를 방지하기 위해 파일명을 직접 찾습니다.
  const files = fs.readdirSync(dataDir);
  const targetFile = files.find(f => f.includes('다이브라이트_딜러') || f.includes('다이브라이트_딜러'));

  if (!targetFile) {
    console.error('통합 CSV 파일을 찾을 수 없습니다.');
    return;
  }

  const filePath = path.join(dataDir, targetFile);
  console.log(`주입 시작: ${targetFile}`);

  const csvContent = fs.readFileSync(filePath, 'utf8');
  // BOM 제거 (있는 경우)
  const cleanContent = csvContent.replace(/^\uFEFF/, '');

  const results = Papa.parse(cleanContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim() // 헤더의 불필요한 공백 제거
  });

  const customers = results.data.map(row => {
    // CSV 헤더와 DB 컬럼 정교하게 매핑
    const company_name = (row['회  사  명'] || row['회 사 명'] || row['회사명'] || '').trim();
    if (!company_name) return null;

    return {
      dealer_tier: (row['딜러티어'] || '기타').trim(),
      company_name: company_name,
      manager_name: (row['담 당 자'] || row['담당자'] || '').trim(),
      phone: (row['연    락    처'] || row['연락처'] || '').trim(),
      email: (row['이   메   일'] || row['이메일'] || '').trim(),
      address: (row['주        소'] || row['주소'] || '').trim(),
      biz_number: (row['사업자등록번호'] || '').trim(),
      biz_name: (row['상호'] || '').trim(),
      ceo_name: (row['대      표'] || row['대표'] || '').trim(),
      tax_email: (row['세금용이메일'] || '').trim(),
      instructor_rank: (row['강사등급'] || '').trim(),
      notes: (row['비고1'] || '').trim(),
    };
  }).filter(c => c !== null);

  if (customers.length > 0) {
    console.log(`${customers.length}개의 데이터를 주입 중...`);
    const { error } = await supabase.from('kr_customers').insert(customers);
    
    if (error) {
      console.error('데이터 주입 에러:', error);
    } else {
      console.log('>>> 통합 데이터 주입 성공! 모든 거래처가 등록되었습니다.');
    }
  }
}

seedUnified();
