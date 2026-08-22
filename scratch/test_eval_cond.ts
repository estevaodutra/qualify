import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const cleanPhone = (phone?: string) => (phone || "").replace(/\D/g, "");

async function evaluateExtensibleCondition(
  config: Record<string, unknown>,
  leadData: Record<string, any> | null,
  companyId: string,
  triggerContext?: any
) {
  const conditionType = config.conditionType as string | undefined;
  const params = (config.parameters as Record<string, unknown>) || {};

  console.log("Input leadData:", leadData);
  console.log("Input triggerContext:", triggerContext);

  if (conditionType === "lead_exists") {
    const identifierField = (params.identifierField as string) || "phone";
    let isFound = false;

    // 1. Check leadData.id
    if (leadData?.id) {
      isFound = true;
      console.log("Found via leadData.id:", leadData.id);
    }

    // 2. Check phone
    if (!isFound && (identifierField === "phone" || !identifierField)) {
      const rawPhone = (params.phone as string) || leadData?.phone || triggerContext?.respondentPhone || triggerContext?.contactPhone || "";
      const phoneToSearch = cleanPhone(rawPhone);
      console.log("phoneToSearch:", phoneToSearch);

      if (phoneToSearch) {
        const { data: dbLead } = await supabase
          .from("leads")
          .select("id, name, phone")
          .eq("company_id", companyId)
          .eq("phone", phoneToSearch)
          .maybeSingle();

        console.log("dbLead query result:", dbLead);
        if (dbLead) {
          isFound = true;
        }
      }
    }

    return { matched: isFound, branch: isFound ? "found" : "not_found" };
  }

  return { matched: false, branch: "not_found" };
}

async function main() {
  const companyId = "dcb34e9a-1510-4137-aecd-cec0c6d548c4";
  const triggerContext = {
    leadId: "99b5072f-1f7b-44c5-b4a0-d061ed7f107f",
    companyId: "dcb34e9a-1510-4137-aecd-cec0c6d548c4",
    sendPrivate: true,
    respondentJid: "5512982402981@s.whatsapp.net",
    respondentName: "Estevão",
    respondentPhone: "5512982402981"
  };

  const { data: leadData } = await supabase
    .from("leads")
    .select("id, name, phone, email, tags, custom_fields, pipeline_stage_id, crm_owner_id, assigned_user_id, attendant_id, cpf")
    .eq("id", triggerContext.leadId)
    .maybeSingle();

  const res = await evaluateExtensibleCondition(
    { conditionType: "lead_exists", parameters: { identifierField: "phone" } },
    leadData,
    companyId,
    triggerContext
  );

  console.log("Final evaluated result:", res);
}

main().catch(console.error);
