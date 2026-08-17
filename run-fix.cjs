const fs = require('fs');
const sql = fs.readFileSync('fix_queue_rpc.sql', 'utf8');
fetch('https://qualify-supabase.d2x.site/functions/v1/temp-run-sql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sql })
}).then(async r => console.log(r.status, await r.text()));
