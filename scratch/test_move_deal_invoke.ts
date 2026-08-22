import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  // Check deal stage before test for lead Estevão (99b5072f-1f7b-44c5-b4a0-d061ed7f107f)
  const { data: dealsBefore } = await supabase
    .from("deals")
    .select("id, title, stage_id, pipeline_id, updated_at")
    .eq("lead_id", "99b5072f-1f7b-44c5-b4a0-d061ed7f107f");

  console.log("Deals before move test:", dealsBefore);

  // Invoke execute-message
  const url = `${supabaseUrl}/functions/v1/execute-message`;
  const body = {
    campaignId: "5dadf41d-b66f-4471-8864-8657fbd24e9c",
    sequenceId: "9e07eb1a-ec0c-4db3-b03f-630ae635e716",
    triggerContext: {
      leadId: "99b5072f-1f7b-44c5-b4a0-d061ed7f107f",
      companyId: "dcb34e9a-1510-4137-aecd-cec0c6d548c4",
      sendPrivate: true,
      respondentJid: "5512982402981@s.whatsapp.net",
      respondentName: "Estevão",
      respondentPhone: "5512982402981"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(body)
  });

  const resJson = await res.json();
  console.log("Execute HTTP status:", res.status, resJson);

  // Check deal stage after test
  const { data: dealsAfter } = await supabase
    .from("deals")
    .select("id, title, stage_id, pipeline_id, updated_at")
    .eq("lead_id", "99b5072f-1f7b-44c5-b4a0-d061ed7f107f");

  console.log("Deals after move test:", dealsAfter);

  // Fetch node executions for latest execution
  const { data: latestExec } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('sequence_id', '9e07eb1a-ec0c-4db3-b03f-630ae635e716')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  console.log("Latest execution ID:", latestExec?.id);

  const { data: nExecs } = await supabase
    .from('workflow_node_executions')
    .select('*')
    .eq('execution_id', latestExec.id)
    .order('started_at', { ascending: true });

  console.log("Node executions:", JSON.stringify(nExecs, null, 2));
}

main().catch(console.error);
