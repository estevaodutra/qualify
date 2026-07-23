const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://qualify.6ksfuf.easypanel.host";
const supabaseServiceKey = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInstances() {
  const { data, error } = await supabase
    .from("instances")
    .select("id, name, phone, external_instance_id")
    .ilike("name", "%Estev%Dutra%Android%Business%");
    
  console.log("Android Business instances:", JSON.stringify(data, null, 2));
}

checkInstances();
