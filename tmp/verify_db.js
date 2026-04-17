const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  const { data, error } = await supabase
    .from('kr_quotes')
    .select('status, is_tax_issued, issued_at, paid_at, shipped_at, delivered_at, tax_issued_at');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  const total = data.length;
  console.log(`Total orders: ${total}`);

  const check = (col) => data.filter(d => d[col]).length;

  console.log(`- issued_at: ${check('issued_at')}/${total}`);
  console.log(`- paid_at: ${check('paid_at')}/${total} (Status: paid/shipped/delivered)`);
  console.log(`- shipped_at: ${check('shipped_at')}/${total} (Status: shipped/delivered)`);
  console.log(`- delivered_at: ${check('delivered_at')}/${total} (Status: delivered)`);
  console.log(`- tax_issued_at: ${check('tax_issued_at')}/${data.filter(d => d.is_tax_issued).length} (Tax issued rows)`);
}

verify();
