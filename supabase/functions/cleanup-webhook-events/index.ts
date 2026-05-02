import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff time (12 hours ago)
    const cutoffTime = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    console.log(`Cleaning up webhook events older than: ${cutoffTime}`);

    // Delete events older than 12 hours
    const { data, error, count } = await supabase
      .from('webhook_events')
      .delete()
      .lt('received_at', cutoffTime)
      .select('id');

    if (error) {
      console.error('Error cleaning up webhook events:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`Successfully deleted ${deletedCount} webhook events`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCount,
        cutoff_time: cutoffTime,
        message: `Deleted ${deletedCount} webhook events older than 12 hours`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
