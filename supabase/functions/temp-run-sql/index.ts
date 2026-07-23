import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check all env vars to find connection string
    const env = Deno.env.toObject();
    const connString = env.DATABASE_URL || env.SUPABASE_DB_URL || env.POSTGRES_URL;

    if (!connString) {
      return new Response(
        JSON.stringify({
          error: "No connection string found in environment variables.",
          availableEnvKeys: Object.keys(env),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const sql = body.sql;

    if (!sql) {
      return new Response(
        JSON.stringify({ error: "Missing 'sql' in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Connecting to Postgres...");
    const client = new Client(connString);
    await client.connect();

    console.log("Executing SQL:", sql);
    const result = await client.queryObject(sql);
    await client.end();

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in temp-run-sql:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
