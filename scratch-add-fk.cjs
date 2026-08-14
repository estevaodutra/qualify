const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qualify-supabase.d2x.site';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODYwNjQ2MzEsImV4cCI6MjEwMTQyNDYzMX0.uTb3j5LmhaahnXkSLXQGoDpAjYAnW2UxCmiK0pnfshU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
ALTER TABLE call_logs
ADD CONSTRAINT call_logs_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES call_leads(id) ON DELETE SET NULL;
  `;
  const url = 'https://qualify-supabase.d2x.site/functions/v1/temp-run-sql';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });
  const data = await response.json();
  console.log("Alter table:", data);
  
  // also run schema cache reload for postgrest just in case
  const reloadSql = `NOTIFY pgrst, 'reload schema';`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: reloadSql })
  });
}
run();
