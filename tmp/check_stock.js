const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkInventory() {
  const { data, error } = await supabase
    .from('kr_inventory')
    .select('product_desc, available_qty')
    .order('product_desc', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

checkInventory();
