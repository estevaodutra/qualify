import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://qualify.6ksfuf.easypanel.host";
const supabaseServiceKey = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanUp() {
  console.log("Fetching running executions...");
  const { data: executions, error: fetchError } = await supabase
    .from("workflow_executions")
    .select("id")
    .eq("status", "running");

  if (fetchError) {
    console.error("Error fetching:", fetchError);
    return;
  }

  if (!executions || executions.length === 0) {
    console.log("No running executions found.");
    return;
  }

  console.log(`Found ${executions.length} running executions. Cancelling them...`);

  for (const exec of executions) {
    const { error: updateError } = await supabase
      .from("workflow_executions")
      .update({
        status: "error",
        error_message: "Execução cancelada manualmente (Limpeza de fila)",
        finished_at: new Date().toISOString()
      })
      .eq("id", exec.id);
    
    if (updateError) {
      console.error(`Error updating ${exec.id}:`, updateError);
    } else {
      console.log(`Successfully cancelled ${exec.id}`);
    }
  }

  console.log("Done.");
}

cleanUp();
