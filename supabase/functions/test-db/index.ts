import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch campaigns
    const { data: campaigns } = await supabase.from("group_campaigns").select("*");
    
    // Fetch sequences
    const { data: sequences } = await supabase.from("message_sequences").select("*");

    // Fetch sequence nodes
    const { data: nodes } = await supabase.from("sequence_nodes").select("*");

    // Fetch campaign groups
    const { data: groups } = await supabase.from("campaign_groups").select("*");

    // Fetch instances
    const { data: instances } = await supabase.from("instances").select("*");

    return new Response(
      JSON.stringify({ campaigns, sequences, nodes, groups, instances }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
