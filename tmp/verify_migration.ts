import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  const { data, error } = await supabase
    .from('kr_quotes')
    .select('id, status, is_tax_issued, issued_at, paid_at, shipped_at, delivered_at, tax_issued_at');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const total = data.length;
  const statusCounts = data.reduce((acc: any, cur: any) => {
    acc[cur.status] = (acc[cur.status] || 0) + 1;
    return acc;
  }, {});

  const filledCounts = {
    issued_at: data.filter((d: any) => d.issued_at).length,
    paid_at: data.filter((d: any) => d.paid_at).length,
    shipped_at: data.filter((d: any) => d.shipped_at).length,
    delivered_at: data.filter((d: any) => d.delivered_at).length,
    tax_issued_at: data.filter((d: any) => d.tax_issued_at).length,
  };

  console.log('Total Quotes:', total);
  console.log('Status breakdown:', statusCounts);
  console.log('Timestamp fill status:', filledCounts);
}

verify();
