const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://qualify.6ksfuf.easypanel.host";
const supabaseServiceKey = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSequence() {
  const { data, error } = await supabase
    .from("group_campaigns")
    .select("id, name, config, instance_id")
    .limit(20);
    
  console.log(JSON.stringify(data, null, 2));
}

checkSequence();
