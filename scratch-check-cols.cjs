const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qualify-supabase.d2x.site';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODYwNjQ2MzEsImV4cCI6MjEwMTQyNDYzMX0.uTb3j5LmhaahnXkSLXQGoDpAjYAnW2UxCmiK0pnfshU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'call_leads';
  `;
  const url = 'https://qualify-supabase.d2x.site/functions/v1/temp-run-sql';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });
  const data = await response.json();
  const columns = data.result.rows.map(r => r.column_name);
  console.log("Columns:", columns);
  console.log("Has email?", columns.includes("email"));
}
run();
