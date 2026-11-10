import { supabase } from "@/integrations/supabase/client";

export interface RemoteGroupItem {
  groupJid: string;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  participantsCount: number;
  participants?: any[];
}

export interface ExtractGroupMembersOptions {
  instanceId: string;
  companyId?: string | null;
  userId?: string | null;
  groups: Array<{
    groupJid: string;
    name: string;
  }>;
  ignoreAdmins?: boolean;
  onProgress?: (progress: {
    currentGroupIndex: number;
    totalGroups: number;
    currentGroupName: string;
    extractedCount: number;
    percentage: number;
  }) => void;
}

export interface ExtractedMemberLead {
  phone: string;
  name: string | null;
  isAdmin: boolean;
  groupJid: string;
  groupName: string;
}

/**
 * Normaliza o telefone removendo sufixos e pontuação.
 */
function normalizePhone(rawPhone: any): string | null {
  if (!rawPhone) return null;
  const str = String(rawPhone);
  if (str.includes("-group") || str.includes("@g.us")) return null;
  const cleaned = str
    .replace(/@s\.whatsapp\.net$/, "")
    .replace(/@c\.us$/, "")
    .replace(/@lid$/, "")
    .replace(/\D/g, "");
  return cleaned && cleaned.length >= 8 ? cleaned : null;
}

/**
 * Busca os participantes de múltiplos grupos através da Z-API (ou da base de group_members),
 * ignora os administradores conforme solicitado, faz o upsert na tabela de `leads` (CRM)
 * e retorna os leads gerados/atualizados prontos para audiência de disparo.
 */
export async function extractAndSaveGroupLeadsToCRM(options: ExtractGroupMembersOptions): Promise<{
  totalExtracted: number;
  newLeadsCount: number;
  existingLeadsCount: number;
  createdLeadIds: string[];
  groupNamesExtracted: string[];
}> {
  const {
    instanceId,
    companyId,
    userId,
    groups,
    ignoreAdmins = true,
    onProgress,
  } = options;

  if (!groups || groups.length === 0) {
    return {
      totalExtracted: 0,
      newLeadsCount: 0,
      existingLeadsCount: 0,
      createdLeadIds: [],
      groupNamesExtracted: [],
    };
  }

  const { data: authData } = await supabase.auth.getUser();
  const targetUserId = userId || authData?.user?.id;

  const allMembersToProcess: ExtractedMemberLead[] = [];
  const phoneDeduplication = new Set<string>();
  const groupNamesSet = new Set<string>();

  // 1. Extrair participantes de cada grupo selecionado
  for (let gi = 0; gi < groups.length; gi++) {
    const grp = groups[gi];
    const groupName = grp.name || grp.groupJid;
    groupNamesSet.add(groupName);

    if (onProgress) {
      onProgress({
        currentGroupIndex: gi + 1,
        totalGroups: groups.length,
        currentGroupName: groupName,
        extractedCount: allMembersToProcess.length,
        percentage: Math.round(((gi) / groups.length) * 100),
      });
    }

    let rawParticipants: any[] = [];

    // Tentar via zapi-proxy primeiro
    if (instanceId) {
      try {
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("zapi-proxy", {
          body: {
            instanceId,
            endpoint: `/group-members?groupId=${grp.groupJid}`,
            method: "GET",
          },
        });

        if (!proxyError && proxyData) {
          const src = proxyData.data || proxyData;
          if (Array.isArray(src)) {
            for (const item of src) {
              if (item.participants && Array.isArray(item.participants)) {
                rawParticipants.push(...item.participants);
              } else if (item.phone || item.id || item.pn) {
                rawParticipants.push(item);
              }
            }
          } else if (Array.isArray(src.participants)) {
            rawParticipants = src.participants;
          } else if (Array.isArray(src.members)) {
            rawParticipants = src.members;
          }
        }
      } catch (e) {
        console.warn(`[extractAndSaveGroupLeadsToCRM] zapi-proxy error for ${grp.groupJid}:`, e);
      }
    }

    // Se a Z-API não retornou ou deu falha de rede, buscar na base local de group_members se existir
    if (rawParticipants.length === 0) {
      try {
        const { data: localMembers } = await supabase
          .from("group_members")
          .select("phone, name, is_admin")
          .eq("group_campaign_id", grp.groupJid);

        if (localMembers && localMembers.length > 0) {
          rawParticipants = localMembers;
        } else {
          // Tentar por campaign_id
          const { data: gc } = await supabase
            .from("group_campaigns")
            .select("id")
            .eq("group_jid", grp.groupJid)
            .maybeSingle();

          if (gc?.id) {
            const { data: gcMembers } = await supabase
              .from("group_members")
              .select("phone, name, is_admin")
              .eq("group_campaign_id", gc.id);
            if (gcMembers) rawParticipants = gcMembers;
          }
        }
      } catch (locErr) {
        console.warn("[extractAndSaveGroupLeadsToCRM] Local group_members query fallback error:", locErr);
      }
    }

    // Filtrar participantes (remover admins e duplicidades)
    for (const p of rawParticipants) {
      const rawPhone = p.phone || p.phoneNumber || p.pn || p.id || "";
      const cleanPhone = normalizePhone(rawPhone);
      if (!cleanPhone) continue;

      const isAdmin = !!(
        p.isAdmin === true ||
        p.is_admin === true ||
        p.isSuperAdmin === true ||
        p.role === "admin" ||
        p.role === "superadmin" ||
        p.admin === "admin" ||
        p.admin === "superadmin"
      );

      // REGRA: Ignorar administradores dos grupos
      if (ignoreAdmins && isAdmin) {
        continue;
      }

      if (phoneDeduplication.has(cleanPhone)) {
        continue;
      }

      phoneDeduplication.add(cleanPhone);
      allMembersToProcess.push({
        phone: cleanPhone,
        name: p.name || p.pushName || p.notify || null,
        isAdmin,
        groupJid: grp.groupJid,
        groupName,
      });
    }

    // Pequena pausa entre requisições de grupos para evitar rate limit
    await new Promise((r) => setTimeout(r, 250));
  }

  if (onProgress) {
    onProgress({
      currentGroupIndex: groups.length,
      totalGroups: groups.length,
      currentGroupName: "Gravando leads no CRM...",
      extractedCount: allMembersToProcess.length,
      percentage: 95,
    });
  }

  if (allMembersToProcess.length === 0) {
    return {
      totalExtracted: 0,
      newLeadsCount: 0,
      existingLeadsCount: 0,
      createdLeadIds: [],
      groupNamesExtracted: Array.from(groupNamesSet),
    };
  }

  // 2. Gravar os participantes como LEADS no CRM
  // Preparar os payloads em lotes
  const leadRows = allMembersToProcess.map((m) => {
    const row: any = {
      phone: m.phone,
      name: m.name && !m.name.includes("@g.us") ? m.name : `Participante ${m.phone}`,
      source_type: "whatsapp_group",
      source_group_name: m.groupName,
      status: "novo",
      updated_at: new Date().toISOString(),
    };
    if (companyId) row.company_id = companyId;
    if (targetUserId) row.user_id = targetUserId;
    return row;
  });

  const createdLeadIds: string[] = [];
  let newLeadsCount = 0;
  let existingLeadsCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < leadRows.length; i += BATCH_SIZE) {
    const batch = leadRows.slice(i, i + BATCH_SIZE);
    
    // Tenta upsert pelo onConflict
    const onConflictConstraint = companyId ? "company_id,phone" : "user_id,phone";
    let upsertRes = await (supabase as any)
      .from("leads")
      .upsert(batch, { onConflict: onConflictConstraint, ignoreDuplicates: false })
      .select("id, phone");

    if (upsertRes.error) {
      // Fallback para onConflict phone,user_id
      upsertRes = await (supabase as any)
        .from("leads")
        .upsert(batch, { onConflict: "phone,user_id", ignoreDuplicates: false })
        .select("id, phone");
    }

    if (upsertRes.data) {
      upsertRes.data.forEach((l: any) => {
        if (l.id) createdLeadIds.push(l.id);
      });
      newLeadsCount += upsertRes.data.length;
    } else {
      // Fallback registro por registro
      for (const singleRow of batch) {
        try {
          const { data: existing } = await supabase
            .from("leads")
            .select("id")
            .eq("phone", singleRow.phone)
            .limit(1)
            .maybeSingle();

          if (existing?.id) {
            await supabase
              .from("leads")
              .update({
                source_group_name: singleRow.source_group_name,
                name: singleRow.name,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            createdLeadIds.push(existing.id);
            existingLeadsCount++;
          } else {
            const { data: inserted } = await supabase
              .from("leads")
              .insert(singleRow)
              .select("id")
              .maybeSingle();
            if (inserted?.id) {
              createdLeadIds.push(inserted.id);
              newLeadsCount++;
            }
          }
        } catch (_rowErr) {
          // ignore single row error
        }
      }
    }
  }

  if (onProgress) {
    onProgress({
      currentGroupIndex: groups.length,
      totalGroups: groups.length,
      currentGroupName: "Concluído!",
      extractedCount: allMembersToProcess.length,
      percentage: 100,
    });
  }

  return {
    totalExtracted: allMembersToProcess.length,
    newLeadsCount,
    existingLeadsCount,
    createdLeadIds,
    groupNamesExtracted: Array.from(groupNamesSet),
  };
}
