import { MemorySaver, BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checkpointer em memória padrão para execuções rápidas e testes unitários.
 */
export const memoryCheckpointer = new MemorySaver();

/**
 * Checkpointer persistente em PostgreSQL / Supabase.
 * Salva estados intermediários e checkpoints para suportar interrupt, resume e Human-in-the-Loop.
 */
export class SupabaseLangGraphCheckpointer extends BaseCheckpointSaver {
  private fallbackMemory = new MemorySaver();

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      return this.fallbackMemory.getTuple(config);
    }

    try {
      const { data } = await (supabase as any)
        .from("ai_executions")
        .select("checkpoint")
        .eq("id", threadId)
        .maybeSingle();

      if (data?.checkpoint && data.checkpoint.checkpoint) {
        return {
          config,
          checkpoint: data.checkpoint.checkpoint,
          metadata: data.checkpoint.metadata || {},
          parentConfig: data.checkpoint.parentConfig,
        };
      }
    } catch {
      // Fallback para memória em caso de falha de conexão
    }

    return this.fallbackMemory.getTuple(config);
  }

  async *list(
    config: RunnableConfig,
    options?: any
  ): AsyncGenerator<CheckpointTuple> {
    // Delega listagem para o memory fallback
    yield* this.fallbackMemory.list(config, options);
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;

    // Salva na memória
    await this.fallbackMemory.put(config, checkpoint, metadata);

    // Se houver thread_id vinculado a uma execução real, persiste no Supabase
    if (threadId) {
      try {
        await (supabase as any)
          .from("ai_executions")
          .update({
            checkpoint: {
              checkpoint,
              metadata,
              saved_at: new Date().toISOString(),
            },
          })
          .eq("id", threadId);
      } catch {
        // Fallback silencioso
      }
    }

    return {
      configurable: {
        ...config.configurable,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(config: RunnableConfig, writes: any[], taskId: string): Promise<void> {
    await this.fallbackMemory.putWrites(config, writes, taskId);
  }
}

export const persistentCheckpointer = new SupabaseLangGraphCheckpointer();
