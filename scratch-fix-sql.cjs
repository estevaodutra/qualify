const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qualify-supabase.d2x.site';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODYwNjQ2MzEsImV4cCI6MjEwMTQyNDYzMX0.uTb3j5LmhaahnXkSLXQGoDpAjYAnW2UxCmiK0pnfshU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid, _user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.company_id = $1
      AND company_members.user_id = $2
      AND (company_members.role = 'admin' OR company_members.role = 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  const url = 'https://qualify-supabase.d2x.site/functions/v1/temp-run-sql';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });
  const data = await response.json();
  console.log("SQL execution result:", data);
}
run();
