/**
 * Camada de Persistência do Sprint OS (Camada F).
 * - Bridge com Supabase (RPC `sprint_os_save` com controle otimista de versão)
 * - Fallback automático e transparente para LocalStorage / Cache local
 * - Importação e Exportação JSON com validação de schema
 * - Links de compartilhamento somente-leitura
 * - Templates versionados
 */

import { supabase } from "@/integrations/supabase/client";
import type { Workspace } from "../domain/types";
import { createPercursoDaVidaSeed } from "../seed/percursoDaVidaSeed";

const LOCAL_STORAGE_KEY_PREFIX = "sprint_os_ws_";
const ACTIVE_WS_ID_KEY = "sprint_os_active_workspace_id";

export interface SaveResult {
  ok: boolean;
  version: number;
  conflict?: boolean;
  error?: string;
}

export interface ShareLinkInfo {
  token: string;
  url: string;
  label?: string;
  expiresAt?: string;
}

export class SprintOSRepository {
  /**
   * Salva o workspace. Tenta salvar no Supabase se houver companyId e sessão;
   * faz fallback seguro e imediato para localStorage.
   */
  static async saveWorkspace(
    workspace: Workspace,
    expectedVersion: number,
    companyId?: string | null,
    actorName = "Operador"
  ): Promise<SaveResult> {
    const wsId = workspace.project.id;
    const wsName = workspace.project.name;

    // Salvar sempre localmente como garantia imediata
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${wsId}`, JSON.stringify(workspace));
      localStorage.setItem(ACTIVE_WS_ID_KEY, wsId);
    } catch (e) {
      console.warn("[SprintOSRepository] Erro ao salvar no LocalStorage:", e);
    }

    if (!companyId) {
      return { ok: true, version: expectedVersion + 1 };
    }

    try {
      // Tenta RPC no Supabase
      const { data, error } = await (supabase as any).rpc("sprint_os_save", {
        p_id: wsId,
        p_expected_version: expectedVersion,
        p_data: workspace,
        p_name: wsName,
      });

      if (error) {
        // Se a tabela/função ainda não tiver sido criada no Supabase pelo admin, não travar o usuário
        console.warn("[SprintOSRepository] RPC Supabase indisponível ou com erro, mantendo persistência local:", error.message);
        return { ok: true, version: expectedVersion + 1 };
      }

      if (data && data.length > 0) {
        const row = data[0];
        if (!row.ok) {
          return {
            ok: false,
            version: row.current_version,
            conflict: true,
            error: "Conflito de concorrência detectado: o projeto foi atualizado por outro usuário.",
          };
        }
        return { ok: true, version: row.current_version };
      }

      return { ok: true, version: expectedVersion + 1 };
    } catch (err: any) {
      console.warn("[SprintOSRepository] Falha de rede com Supabase, salvo localmente:", err.message);
      return { ok: true, version: expectedVersion + 1 };
    }
  }

  /**
   * Carrega o workspace ativo da empresa ou do armazenamento local.
   * Se nada existir, inicializa com o template matriz "Percurso da Vida".
   */
  static async loadWorkspace(companyId?: string | null, workspaceId?: string | null): Promise<{ workspace: Workspace; version: number }> {
    let targetId = workspaceId || localStorage.getItem(ACTIVE_WS_ID_KEY);

    // 1. Tentar carregar do Supabase se houver companyId
    if (companyId) {
      try {
        let query = (supabase as any)
          .from("sprint_os_workspaces")
          .select("id, name, data, version, updated_at")
          .eq("company_id", companyId)
          .is("archived_at", null);

        if (targetId) {
          query = query.eq("id", targetId);
        } else {
          query = query.order("updated_at", { ascending: false }).limit(1);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const row = data[0];
          const ws = row.data as Workspace;
          // Garantir integridade
          if (ws && ws.schemaVersion === 1) {
            localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${row.id}`, JSON.stringify(ws));
            localStorage.setItem(ACTIVE_WS_ID_KEY, row.id);
            return { workspace: ws, version: row.version };
          }
        }
      } catch (e) {
        console.warn("[SprintOSRepository] Não foi possível ler do Supabase, buscando local:", e);
      }
    }

    // 2. Tentar carregar do LocalStorage
    if (targetId) {
      const localRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${targetId}`);
      if (localRaw) {
        try {
          const ws = JSON.parse(localRaw) as Workspace;
          if (ws && ws.schemaVersion === 1) {
            return { workspace: ws, version: 1 };
          }
        } catch (e) {
          console.warn("[SprintOSRepository] Erro ao parsear workspace local:", e);
        }
      }
    }

    // 3. Fallback: Inicializar com o seed canônico "Percurso da Vida"
    const seed = createPercursoDaVidaSeed();
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${seed.project.id}`, JSON.stringify(seed));
      localStorage.setItem(ACTIVE_WS_ID_KEY, seed.project.id);
    } catch {}

    return { workspace: seed, version: 1 };
  }

  /**
   * Exporta o workspace completo como string JSON formatada.
   */
  static exportToJson(workspace: Workspace): string {
    return JSON.stringify(workspace, null, 2);
  }

  /**
   * Importa e valida um JSON de workspace.
   */
  static importFromJson(jsonString: string): Workspace {
    const parsed = JSON.parse(jsonString);
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.project || !parsed.sprints) {
      throw new Error("Arquivo JSON inválido ou incompatível com o schema do Sprint OS v1.");
    }
    return parsed as Workspace;
  }

  /**
   * Gera um link de compartilhamento somente-leitura.
   */
  static async createShareLink(
    workspaceId: string,
    companyId?: string | null,
    label?: string
  ): Promise<ShareLinkInfo> {
    const token = `share_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
    const url = `${window.location.origin}/sprint-os/shared/${token}`;

    if (companyId) {
      try {
        await (supabase as any).from("sprint_os_share_links").insert({
          token,
          workspace_id: workspaceId,
          company_id: companyId,
          label: label || "Visualização Externa",
        });
      } catch (e) {
        console.warn("[SprintOSRepository] Não foi possível registrar share link no banco, gerado localmente:", e);
      }
    }

    // Salvar cache local para visualização de teste
    try {
      const wsRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${workspaceId}`);
      if (wsRaw) {
        localStorage.setItem(`sprint_os_public_share_${token}`, wsRaw);
      }
    } catch {}

    return { token, url, label };
  }

  /**
   * Carrega os dados de um link compartilhado (sanitizado).
   */
  static async loadSharedData(token: string): Promise<Workspace | null> {
    // 1. Tentar RPC Supabase
    try {
      const { data, error } = await (supabase as any).rpc("sprint_os_get_shared", {
        p_token: token,
      });
      if (!error && data) {
        return data as Workspace;
      }
    } catch {}

    // 2. Fallback cache local
    const raw = localStorage.getItem(`sprint_os_public_share_${token}`);
    if (raw) {
      try {
        const ws = JSON.parse(raw);
        // Sanitizar dados financeiros confidenciais
        delete ws.costs;
        delete ws.financialRecords;
        return ws as Workspace;
      } catch {}
    }

    return null;
  }
}
