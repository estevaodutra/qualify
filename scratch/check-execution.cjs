require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const executionId = "e9fba453-c85d-4486-bad8-1f211bc668d3";

  console.log("=== WORKFLOW EXECUTION ===");
  const { data: exec } = await supabase.from('workflow_executions').select('*').eq('id', executionId).single();
  console.log(JSON.stringify(exec, null, 2));

  console.log("\n=== NODE EXECUTIONS ===");
  const { data: nodes } = await supabase.from('workflow_node_executions').select('*').eq('workflow_execution_id', executionId);
  console.log(JSON.stringify(nodes, null, 2));

  console.log("\n=== CALL TASKS ===");
  const { data: tasks } = await supabase.from('workflow_call_tasks').select('*').eq('workflow_execution_id', executionId);
  console.log(JSON.stringify(tasks, null, 2));

  if (tasks && tasks.length > 0 && tasks[0].lead_id) {
    console.log("\n=== LEAD ===");
    const { data: lead } = await supabase.from('leads').select('*').eq('id', tasks[0].lead_id).single();
    console.log(JSON.stringify(lead, null, 2));
  } else if (exec && exec.phone) {
    console.log("\n=== LEAD BY PHONE ===");
    const { data: lead } = await supabase.from('leads').select('*').eq('phone', exec.phone);
    console.log(JSON.stringify(lead, null, 2));
  }
}

run().catch(console.error);
