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
import { createBlankWorkspace, newId } from "../domain/ops";

const LOCAL_STORAGE_KEY_PREFIX = "sprint_os_ws_";
const TEMPLATE_STORAGE_KEY_PREFIX = "sprint_os_tpl_";
const ACTIVE_WS_ID_KEY = "sprint_os_active_workspace_id";

export interface WorkspaceListItem {
  id: string;
  name: string;
  projectName: string;
  client: string;
  updatedAt: string;
  taskCount: number;
  doneTaskCount: number;
  progress: number;
  status: "draft" | "active" | "completed";
  sprintCount: number;
}

export interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  stageCount: number;
  taskCount: number;
  createdAt: string;
  isDefault?: boolean;
}

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
   * Lista todos os cronogramas (workspaces) salvos da empresa e do cache local.
   */
  static async listWorkspaces(companyId?: string | null): Promise<WorkspaceListItem[]> {
    const map = new Map<string, WorkspaceListItem>();

    // 1. Carregar do LocalStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const ws = JSON.parse(raw) as Workspace;
            if (ws?.project?.id) {
              const liveTasks = Object.values(ws.tasks || {}).filter((t) => !t.archivedAt);
              const doneTasks = liveTasks.filter((t) => t.status === "done");
              const activeSprint = Object.values(ws.sprints || {}).find((s) => !s.archivedAt && s.status === "active")
                || Object.values(ws.sprints || {}).find((s) => !s.archivedAt);

              const sprintStatus: "draft" | "active" | "completed" =
                activeSprint?.status === "completed"
                  ? "completed"
                  : activeSprint?.activatedAt
                  ? "active"
                  : "draft";

              map.set(ws.project.id, {
                id: ws.project.id,
                name: activeSprint?.name || ws.project.name,
                projectName: ws.project.name,
                client: ws.project.client || "Cliente",
                updatedAt: ws.project.updatedAt || new Date().toISOString(),
                taskCount: liveTasks.length,
                doneTaskCount: doneTasks.length,
                progress: liveTasks.length ? Math.round((doneTasks.length / liveTasks.length) * 100) : 0,
                status: sprintStatus,
                sprintCount: Object.keys(ws.sprints || {}).length,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("[SprintOSRepository] Erro ao listar do LocalStorage:", e);
    }

    // 2. Carregar do Supabase se houver companyId
    if (companyId) {
      try {
        const { data, error } = await (supabase as any)
          .from("sprint_os_workspaces")
          .select("id, name, data, updated_at")
          .eq("company_id", companyId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false });

        if (!error && data) {
          data.forEach((row: any) => {
            const ws = row.data as Workspace;
            if (ws && ws.project) {
              const liveTasks = Object.values(ws.tasks || {}).filter((t) => !t.archivedAt);
              const doneTasks = liveTasks.filter((t) => t.status === "done");
              const activeSprint = Object.values(ws.sprints || {}).find((s) => !s.archivedAt && s.status === "active")
                || Object.values(ws.sprints || {}).find((s) => !s.archivedAt);

              map.set(row.id, {
                id: row.id,
                name: activeSprint?.name || row.name || ws.project.name,
                projectName: ws.project.name,
                client: ws.project.client || "Cliente",
                updatedAt: row.updated_at || ws.project.updatedAt,
                taskCount: liveTasks.length,
                doneTaskCount: doneTasks.length,
                progress: liveTasks.length ? Math.round((doneTasks.length / liveTasks.length) * 100) : 0,
                status: activeSprint?.activatedAt ? "active" : "draft",
                sprintCount: Object.keys(ws.sprints || {}).length,
              });
            }
          });
        }
      } catch (e) {
        console.warn("[SprintOSRepository] Erro ao listar do Supabase:", e);
      }
    }

    // Se nenhum cronograma existir, inicializa o seed matriz "Percurso da Vida"
    if (map.size === 0) {
      const seed = createPercursoDaVidaSeed();
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${seed.project.id}`, JSON.stringify(seed));
      const liveTasks = Object.values(seed.tasks).filter((t) => !t.archivedAt);
      const doneTasks = liveTasks.filter((t) => t.status === "done");
      map.set(seed.project.id, {
        id: seed.project.id,
        name: Object.values(seed.sprints)[0]?.name || seed.project.name,
        projectName: seed.project.name,
        client: seed.project.client,
        updatedAt: seed.project.updatedAt,
        taskCount: liveTasks.length,
        doneTaskCount: doneTasks.length,
        progress: liveTasks.length ? Math.round((doneTasks.length / liveTasks.length) * 100) : 0,
        status: "draft",
        sprintCount: 1,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

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
      const { data, error } = await (supabase as any).rpc("sprint_os_save", {
        p_id: wsId,
        p_expected_version: expectedVersion,
        p_data: workspace,
        p_name: wsName,
      });

      if (error) {
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
   * Carrega um workspace específico por ID.
   */
  static async loadWorkspace(companyId?: string | null, workspaceId?: string | null): Promise<{ workspace: Workspace; version: number }> {
    let targetId = workspaceId || localStorage.getItem(ACTIVE_WS_ID_KEY);

    // 1. Tentar carregar do Supabase se houver companyId e targetId
    if (companyId && targetId) {
      try {
        const { data, error } = await (supabase as any)
          .from("sprint_os_workspaces")
          .select("id, name, data, version, updated_at")
          .eq("company_id", companyId)
          .eq("id", targetId)
          .is("archived_at", null)
          .maybeSingle();

        if (!error && data && data.data) {
          const ws = data.data as Workspace;
          if (ws && ws.schemaVersion === 1) {
            localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${data.id}`, JSON.stringify(ws));
            localStorage.setItem(ACTIVE_WS_ID_KEY, data.id);
            return { workspace: ws, version: data.version };
          }
        }
      } catch (e) {
        console.warn("[SprintOSRepository] Erro ao buscar do Supabase:", e);
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
   * Exclui um cronograma do banco e do LocalStorage.
   */
  static async deleteWorkspace(workspaceId: string, companyId?: string | null): Promise<void> {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${workspaceId}`);
      if (localStorage.getItem(ACTIVE_WS_ID_KEY) === workspaceId) {
        localStorage.removeItem(ACTIVE_WS_ID_KEY);
      }
    } catch {}

    if (companyId) {
      try {
        await (supabase as any)
          .from("sprint_os_workspaces")
          .delete()
          .eq("id", workspaceId)
          .eq("company_id", companyId);
      } catch (e) {
        console.warn("[SprintOSRepository] Erro ao excluir do Supabase:", e);
      }
    }
  }

  /**
   * Duplica um cronograma gerando novos IDs e zerando execuções passadas.
   */
  static duplicateWorkspace(source: Workspace, newName: string): Workspace {
    const clone = JSON.parse(JSON.stringify(source)) as Workspace;
    const oldProjId = clone.project.id;
    const newProjId = newId();
    const now = new Date().toISOString();

    clone.project.id = newProjId;
    clone.project.name = newName;
    clone.project.createdAt = now;
    clone.project.updatedAt = now;
    clone.project.rev = 1;

    // Reseta status de sprints
    Object.values(clone.sprints).forEach((s) => {
      s.activatedAt = null;
      s.baseline = null;
      s.updatedAt = now;
    });

    // Reseta tarefas para pendente
    Object.values(clone.tasks).forEach((t) => {
      t.status = "pending";
      t.actualStart = null;
      t.actualEnd = null;
      t.timeEntries = [];
      t.acceptedAt = null;
      t.acceptedBy = null;
      t.blockedReason = null;
    });

    // Reseta subtarefas
    Object.values(clone.subtasks).forEach((st) => {
      st.done = false;
      st.doneAt = null;
      st.count = 0;
    });

    clone.revisions = {};
    clone.activity = [
      {
        id: newId(),
        at: now,
        actorName: "Sistema",
        action: "duplicate",
        entity: "workspace",
        entityId: newProjId,
        summary: `Cronograma duplicado a partir de "${source.project.name}"`,
      },
    ];

    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${newProjId}`, JSON.stringify(clone));
    } catch {}

    return clone;
  }

  /**
   * Transforma um cronograma em Template reutilizável (sem dados de execução ou financeiros reais).
   */
  static saveAsTemplate(workspace: Workspace, templateName: string): TemplateListItem {
    const templateId = `tpl_${newId()}`;
    const clone = JSON.parse(JSON.stringify(workspace)) as Workspace;
    const now = new Date().toISOString();

    // Sanitiza execuções e dados confidenciais
    clone.costs = {};
    clone.financialRecords = {};
    Object.values(clone.tasks).forEach((t) => {
      t.status = "pending";
      t.actualStart = null;
      t.actualEnd = null;
      t.timeEntries = [];
      t.evidence = [];
    });
    Object.values(clone.subtasks).forEach((st) => {
      st.done = false;
      st.doneAt = null;
    });

    const tplItem: TemplateListItem = {
      id: templateId,
      name: templateName,
      description: clone.project.description || "Template reutilizável",
      stageCount: Object.values(clone.stages).filter((s) => !s.archivedAt).length,
      taskCount: Object.values(clone.tasks).filter((t) => !t.archivedAt).length,
      createdAt: now,
      isDefault: false,
    };

    try {
      localStorage.setItem(`${TEMPLATE_STORAGE_KEY_PREFIX}${templateId}`, JSON.stringify({ meta: tplItem, data: clone }));
    } catch (e) {
      console.warn("[SprintOSRepository] Erro ao salvar template localmente:", e);
    }

    return tplItem;
  }

  /**
   * Obtém a definição completa de um template para edição.
   */
  static getTemplate(templateId: string): { meta: TemplateListItem; data: Workspace } | null {
    try {
      const raw = localStorage.getItem(`${TEMPLATE_STORAGE_KEY_PREFIX}${templateId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}

    if (templateId === "seed_percurso_da_vida") {
      const seed = createPercursoDaVidaSeed();
      const meta: TemplateListItem = {
        id: "seed_percurso_da_vida",
        name: "SPRINT 10 DIAS — Colocar a Máquina para Rodar",
        description: "Template oficial de ativação comercial: CRM, SDR, Tráfego Pago, Scripts e Funil X1.",
        stageCount: Object.values(seed.stages).length,
        taskCount: Object.values(seed.tasks).length,
        createdAt: "2026-10-21T00:00:00Z",
        isDefault: true,
      };
      return { meta, data: seed };
    }

    return null;
  }

  /**
   * Atualiza os dados de um template existente (ou sobrescreve).
   */
  static updateTemplate(templateId: string, metaPatch: Partial<TemplateListItem>, dataPatch?: Workspace): void {
    const existing = this.getTemplate(templateId);
    const updatedMeta: TemplateListItem = {
      ...(existing?.meta || {
        id: templateId,
        name: "Template",
        description: "",
        stageCount: 0,
        taskCount: 0,
        createdAt: new Date().toISOString(),
      }),
      ...metaPatch,
    };
    const updatedData = dataPatch || existing?.data || createPercursoDaVidaSeed();
    updatedMeta.stageCount = Object.values(updatedData.stages || {}).filter((s) => !s.archivedAt).length;
    updatedMeta.taskCount = Object.values(updatedData.tasks || {}).filter((t) => !t.archivedAt).length;

    try {
      localStorage.setItem(
        `${TEMPLATE_STORAGE_KEY_PREFIX}${templateId}`,
        JSON.stringify({ meta: updatedMeta, data: updatedData })
      );
    } catch (e) {
      console.warn("[SprintOSRepository] Erro ao atualizar template:", e);
    }
  }

  /**
   * Remove um template customizado.
   */
  static deleteTemplate(templateId: string): void {
    try {
      localStorage.removeItem(`${TEMPLATE_STORAGE_KEY_PREFIX}${templateId}`);
    } catch {}
  }

  /**
   * Lista todos os templates disponíveis.
   */
  static listTemplates(): TemplateListItem[] {
    let defaultSeedMeta: TemplateListItem = {
      id: "seed_percurso_da_vida",
      name: "SPRINT 10 DIAS — Colocar a Máquina para Rodar",
      description: "Template oficial de ativação comercial: CRM, SDR, Tráfego Pago, Scripts e Funil X1.",
      stageCount: 8,
      taskCount: 26,
      createdAt: "2026-10-21T00:00:00Z",
      isDefault: true,
    };

    const customTemplates: TemplateListItem[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(TEMPLATE_STORAGE_KEY_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.meta) {
              if (parsed.meta.id === "seed_percurso_da_vida") {
                defaultSeedMeta = { ...defaultSeedMeta, ...parsed.meta, isDefault: true };
              } else {
                customTemplates.push(parsed.meta);
              }
            }
          }
        }
      }
    } catch {}

    return [defaultSeedMeta, ...customTemplates];
  }

  /**
   * Cria um workspace a partir de um template.
   */
  static createFromTemplate(templateId: string, name: string, client = "Cliente"): Workspace {
    try {
      const raw = localStorage.getItem(`${TEMPLATE_STORAGE_KEY_PREFIX}${templateId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data) {
          const ws = JSON.parse(JSON.stringify(parsed.data)) as Workspace;
          const newProjId = newId();
          ws.project.id = newProjId;
          ws.project.name = name;
          ws.project.client = client;
          return ws;
        }
      }
    } catch {}

    if (templateId === "seed_percurso_da_vida") {
      const seed = createPercursoDaVidaSeed();
      const ws = JSON.parse(JSON.stringify(seed)) as Workspace;
      const newProjId = newId();
      ws.project.id = newProjId;
      ws.project.name = name;
      ws.project.client = client;
      return ws;
    }

    try {
      const raw = localStorage.getItem(`${TEMPLATE_STORAGE_KEY_PREFIX}${templateId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const ws = parsed.data as Workspace;
        const newProjId = newId();
        ws.project.id = newProjId;
        ws.project.name = name;
        ws.project.client = client;
        return ws;
      }
    } catch {}

    // Fallback seed
    const seed = createPercursoDaVidaSeed();
    seed.project.id = newId();
    seed.project.name = name;
    seed.project.client = client;
    return seed;
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
