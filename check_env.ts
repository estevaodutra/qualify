import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL; // Wait, usually Supabase exposes DATABASE_URL in standard setups, let me just check the env vars.

async function main() {
  console.log(Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL')));
}
main().catch(console.error);
