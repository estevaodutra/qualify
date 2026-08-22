import * as dotenv from 'dotenv';
dotenv.config();

console.log("Env keys:", Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("TOKEN") || k.includes("KEY")));
