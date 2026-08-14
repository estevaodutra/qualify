const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qualify-supabase.d2x.site';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODYwNjQ2MzEsImV4cCI6MjEwMTQyNDYzMX0.uTb3j5LmhaahnXkSLXQGoDpAjYAnW2UxCmiK0pnfshU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('call_queue').select('*');
  console.log("Call queue:", data?.length, "error:", error);
  
  // Try to insert a dummy lead to see what happens
  const { data: leads } = await supabase.from('leads').select('*').limit(1);
  if (leads && leads.length > 0) {
    console.log("Found lead:", leads[0].id);
    
    // Get Fila Aberta
    const { data: camp } = await supabase.from('call_campaigns').select('*').eq('name', 'Fila Aberta (Geral)').single();
    if (camp) {
      console.log("Found campaign:", camp.id);
      
      const { data: insertData, error: insertError } = await supabase.from('call_queue').insert({
        user_id: '08dfd69e-8c6c-4e7e-8202-468b512eb459', // Estevão
        company_id: 'dcb34e9a-1510-4137-aecd-cec0c6d548c4',
        campaign_id: camp.id,
        lead_id: leads[0].id,
        phone: leads[0].phone || '+551234567890',
        position: 1,
        source: 'manual'
      });
      console.log("Insert result:", insertData, insertError);
    }
  }
}
run();
