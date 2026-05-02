import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 72 hours ago
    const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    console.log(`[cleanup-logs] Starting cleanup for logs older than ${cutoffDate}`);

    // Delete old group_message_logs
    const { error: messageLogs, count: messageLogsDeleted } = await supabase
      .from("group_message_logs")
      .delete({ count: "exact" })
      .lt("sent_at", cutoffDate);

    if (messageLogs) {
      console.error("[cleanup-logs] Error deleting group_message_logs:", messageLogs.message);
    } else {
      console.log(`[cleanup-logs] Deleted ${messageLogsDeleted || 0} records from group_message_logs`);
    }

    // Delete old api_logs
    const { error: apiLogsError, count: apiLogsDeleted } = await supabase
      .from("api_logs")
      .delete({ count: "exact" })
      .lt("created_at", cutoffDate);

    if (apiLogsError) {
      console.error("[cleanup-logs] Error deleting api_logs:", apiLogsError.message);
    } else {
      console.log(`[cleanup-logs] Deleted ${apiLogsDeleted || 0} records from api_logs`);
    }

    // Delete old dispatch_logs
    const { error: dispatchLogsError, count: dispatchLogsDeleted } = await supabase
      .from("dispatch_logs")
      .delete({ count: "exact" })
      .lt("created_at", cutoffDate);

    if (dispatchLogsError) {
      console.error("[cleanup-logs] Error deleting dispatch_logs:", dispatchLogsError.message);
    } else {
      console.log(`[cleanup-logs] Deleted ${dispatchLogsDeleted || 0} records from dispatch_logs`);
    }

    const result = {
      success: true,
      cutoffDate,
      deleted: {
        group_message_logs: messageLogsDeleted || 0,
        api_logs: apiLogsDeleted || 0,
        dispatch_logs: dispatchLogsDeleted || 0,
      },
      timestamp: new Date().toISOString(),
    };

    console.log("[cleanup-logs] Cleanup completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[cleanup-logs] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
