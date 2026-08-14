const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qualify-supabase.d2x.site';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODYwNjQ2MzEsImV4cCI6MjEwMTQyNDYzMX0.uTb3j5LmhaahnXkSLXQGoDpAjYAnW2UxCmiK0pnfshU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'public.call_logs'::regclass;
  `;
  const url = 'https://qualify-supabase.d2x.site/functions/v1/temp-run-sql';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });
  const data = await response.json();
  console.log("Constraints:", JSON.stringify(data.result.rows, null, 2));
}
run();
