import { supabase } from "@/integrations/supabase/client";

const DEFAULT_BATCH_SIZE = 50;

/**
 * Upsert seguro em batches pequenos com fallback row-a-row.
 * Garante que falhas em uma linha não cancelam o batch inteiro silenciosamente.
 * Retorna { synced, failed } para feedback ao usuário.
 */
export async function safeBatchUpsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await (supabase as any).from(table).upsert(batch, { onConflict });
    if (!error) {
      synced += batch.length;
      continue;
    }
    console.warn(`[safeBatchUpsert] batch failed for ${table}:`, error.message);
    for (const row of batch) {
      const { error: rowError } = await (supabase as any).from(table).upsert([row], { onConflict });
      if (rowError) {
        failed++;
        console.warn(`[safeBatchUpsert] row failed for ${table}:`, rowError.message, row);
      } else {
        synced++;
      }
    }
  }
  return { synced, failed };
}
