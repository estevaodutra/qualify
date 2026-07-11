import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sqlQuery = `
-- 1. Remover mensagens duplicadas mantendo apenas a primeira criada
DELETE FROM public.chat_messages a USING (
    SELECT MIN(ctid) as ctid, message_id
    FROM public.chat_messages
    WHERE message_id IS NOT NULL
    GROUP BY message_id
    HAVING COUNT(*) > 1
) b
WHERE a.message_id = b.message_id
AND a.ctid <> b.ctid;

-- 2. Adicionar restrição UNIQUE para evitar novos duplicados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'chat_messages_message_id_key'
    ) THEN
        ALTER TABLE public.chat_messages
        ADD CONSTRAINT chat_messages_message_id_key UNIQUE (message_id);
    END IF;
END $$;
`;

async function main() {
  // Use the Edge Function context trick or directly run SQL if there is a way?
  // Wait, I don't have execute_sql! I can't run this script from here.
  console.log("SQL to execute:\\n", sqlQuery);
}

main().catch(console.error);
