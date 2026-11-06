import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const action = body.action || "sync-token";
    const userId = body.user_id;

    if (!userId && action !== "get-master-config" && action !== "save-master-config") {
      return new Response(
        JSON.stringify({ success: false, error: "user_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper: Buscar configurações master da plataforma
    async function getMasterConfig() {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "api4com_master_config")
        .maybeSingle();

      const envAdminToken = Deno.env.get("API4COM_ADMIN_TOKEN");
      const configVal = (data?.value as Record<string, string>) || {};

      // Master token perpétuo da conta master oficial comercial@d2xnegociosdigitais.com
      const MASTER_TOKEN_DEFAULT = "043yV21WZWJuYVyWPEsQJ6Rwn31IokCwI5GxZgmhpkya59OR1enk8GEq8ebdrhT4";
      const MASTER_DOMAIN_DEFAULT = "d2x.api4com.com";

      return {
        admin_token: configVal.admin_token || envAdminToken || MASTER_TOKEN_DEFAULT,
        default_domain: configVal.default_domain || MASTER_DOMAIN_DEFAULT,
      };
    }

    // Ação: Obter config master
    if (action === "get-master-config") {
      const config = await getMasterConfig();
      return new Response(
        JSON.stringify({ success: true, config: { ...config, admin_token_masked: config.admin_token ? `••••••••${config.admin_token.slice(-6)}` : "" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ação: Salvar config master
    if (action === "save-master-config") {
      const { admin_token, default_domain } = body;
      const current = await getMasterConfig();
      const updated = {
        admin_token: admin_token !== undefined ? admin_token.trim() : current.admin_token,
        default_domain: default_domain !== undefined ? default_domain.trim() : current.default_domain,
      };

      await supabase.from("platform_settings").upsert({
        key: "api4com_master_config",
        value: updated,
        description: "Configurações e token mestre da API4COM para provisionamento automático de usuários",
        updated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, message: "Configurações mestras salvas com sucesso!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ----------------------------------------------------
    // Ação: REMOVER TOKEN
    // ----------------------------------------------------
    if (action === "remove-token") {
      await supabase
        .from("profiles")
        .update({
          api4com_token: null,
          api4com_extension: null,
          api4com_domain: null,
          api4com_password: null,
          api4com_user_id: null,
          api4com_synced_at: null,
        })
        .eq("id", userId);

      await supabase
        .from("call_operators")
        .update({
          api4com_token: null,
          extension: null,
          sip_domain: null,
          sip_password: null,
          sip_integration_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, message: "Token e dados da API4COM removidos com sucesso." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ----------------------------------------------------
    // Helper: Configurar SIP e Webhook com um token válido
    // ----------------------------------------------------
    async function configureSipAndWebhook(token: string) {
      const cleanToken = token.trim();

      // 1. Validar token e obter perfil
      const meRes = await fetch("https://api.api4com.com/api/v1/users/me", {
        headers: { Authorization: cleanToken },
      });

      if (!meRes.ok) {
        throw new Error(`Token API4COM inválido ou não autorizado (HTTP ${meRes.status}).`);
      }
      const userData = await meRes.json();

      // 2. Buscar ramal SIP
      let sipExtension: string | null = null;
      let sipDomain: string | null = null;
      let sipPassword: string | null = null;
      let sipIntegrationId: number | null = null;

      try {
        const ramalRes = await fetch(
          "https://api.api4com.com/api/v1/integrations?filter[where][gateway]=sippulse",
          { headers: { Authorization: cleanToken } }
        );

        if (ramalRes.ok) {
          const ramalList = await ramalRes.json();
          if (Array.isArray(ramalList) && ramalList.length > 0 && ramalList[0]?.metadata) {
            const meta = ramalList[0].metadata;
            sipExtension = String(meta.username || "");
            sipDomain = String(meta.domain || "");
            sipPassword = String(meta.password || "");
            sipIntegrationId = ramalList[0].id || null;
          }
        }
      } catch (e) {
        console.warn("[api4com-manage-user] Aviso ao buscar ramal SIP:", e);
      }

      // 3. Configurar Webhook da Qualify
      try {
        let existingWebhookId: number | null = null;
        const checkWebhookRes = await fetch(
          "https://api.api4com.com/api/v1/integrations?filter[where][gateway]=qualify-crm",
          { headers: { Authorization: cleanToken } }
        );
        if (checkWebhookRes.ok) {
          const integrations = await checkWebhookRes.json();
          if (Array.isArray(integrations) && integrations.length > 0) {
            existingWebhookId = integrations[0].id;
          }
        }

        const webhookPayload: Record<string, unknown> = {
          gateway: "qualify-crm",
          webhook: true,
          webhookConstraint: {
            metadata: {
              gateway: "qualify-crm",
            },
          },
          metadata: {
            webhookUrl: `${supabaseUrl}/functions/v1/api4com-webhook`,
            webhookVersion: "v1.8",
            webhookTypes: ["channel-answer", "channel-hangup"],
          },
        };

        if (existingWebhookId) {
          webhookPayload.id = existingWebhookId;
        }

        await fetch("https://api.api4com.com/api/v1/integrations", {
          method: "PATCH",
          headers: {
            Authorization: cleanToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        });
      } catch (e) {
        console.warn("[api4com-manage-user] Aviso ao registrar webhook:", e);
      }

      return {
        userData,
        sipExtension,
        sipDomain,
        sipPassword,
        sipIntegrationId,
      };
    }

    // ----------------------------------------------------
    // Ação: SYNC-TOKEN / SET-TOKEN (Manual)
    // ----------------------------------------------------
    if (action === "sync-token" || action === "set-token") {
      const { api4com_token } = body;
      if (!api4com_token) {
        return new Response(
          JSON.stringify({ success: false, error: "api4com_token é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cleanToken = String(api4com_token).trim();
      const { userData, sipExtension, sipDomain, sipPassword, sipIntegrationId } =
        await configureSipAndWebhook(cleanToken);

      // Salva no perfil do usuário
      const nowIso = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({
          api4com_token: cleanToken,
          api4com_extension: sipExtension,
          api4com_domain: sipDomain,
          api4com_password: sipPassword,
          api4com_user_id: userData?.id ? String(userData.id) : null,
          api4com_synced_at: nowIso,
        })
        .eq("id", userId);

      // Atualiza os registros existentes em call_operators para este usuário
      await supabase
        .from("call_operators")
        .update({
          api4com_token: cleanToken,
          extension: sipExtension,
          sip_domain: sipDomain,
          sip_password: sipPassword,
          sip_integration_id: sipIntegrationId,
          updated_at: nowIso,
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Token API4COM validado e salvo com sucesso!",
          token: cleanToken,
          extension: sipExtension,
          domain: sipDomain,
          user: {
            id: userData?.id,
            name: userData?.name,
            email: userData?.email,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ----------------------------------------------------
    // Ação: GENERATE-TOKEN / CREATE-USER NA API4COM
    // ----------------------------------------------------
    if (action === "generate-token" || action === "create-user") {
      const email = body.email?.trim().toLowerCase();
      const name = body.name?.trim() || email?.split("@")[0] || "Usuário Qualify";
      const phone = body.phone?.trim() || "5511999999999";
      let password = body.password?.trim();

      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: "email é obrigatório para gerar usuário na API4COM" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Senha padrão oficial da organização API4COM
      if (!password) {
        password = "carvalho159";
      }

      const master = await getMasterConfig();
      const adminToken = body.admin_token?.trim() || master.admin_token;

      let perpetualToken: string | null = null;
      let api4comUserId: string | null = null;

      // 1. Tentar criar o usuário na API4COM se tivermos o token de admin
      if (adminToken) {
        try {
          const createRes = await fetch("https://api.api4com.com/api/v1/users", {
            method: "POST",
            headers: {
              Authorization: adminToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              email,
              password,
              phone,
              role: "USER",
              emailVerified: true,
            }),
          });

          if (createRes.ok) {
            const createdUser = await createRes.json();
            api4comUserId = createdUser?.uuid || (createdUser?.id ? String(createdUser.id) : null);
          } else {
            const errBody = await createRes.text();
            console.log("[api4com-manage-user] Aviso ao criar usuário via admin token (pode já existir):", errBody);
          }
        } catch (e) {
          console.warn("[api4com-manage-user] Erro na tentativa de criação de usuário:", e);
        }
      }

      // 2. Fazer Login com as credenciais do usuário para obter o token de sessão
      let loginRes = await fetch("https://api.api4com.com/api/v1/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      // Se falhar o login com a senha fornecida, tenta automaticamente com a senha mestra padrão
      if (!loginRes.ok && password !== "carvalho159") {
        const retryLogin = await fetch("https://api.api4com.com/api/v1/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: "carvalho159",
          }),
        });
        if (retryLogin.ok) {
          loginRes = retryLogin;
          password = "carvalho159";
        }
      }

      if (!loginRes.ok) {
        const loginErr = await loginRes.text();
        let parsedErr: any = null;
        try { parsedErr = JSON.parse(loginErr); } catch (_) {}

        // Se o login falhou porque o usuário já existia com outra senha, tentar buscar dados do usuário via admin token
        if (adminToken) {
          try {
            const findRes = await fetch(
              `https://api.api4com.com/api/v1/users?filter[where][email]=${encodeURIComponent(email)}`,
              { headers: { Authorization: adminToken } }
            );
            if (findRes.ok) {
              const usersFound = await findRes.json();
              if (Array.isArray(usersFound) && usersFound.length > 0) {
                const existingUser = usersFound[0];
                const existingExt = existingUser.extension ? String(existingUser.extension) : null;
                const existingUuid = existingUser.uuid ? String(existingUser.uuid) : null;

                // Salva o ramal existente no profile caso exista
                if (existingExt) {
                  await supabase
                    .from("profiles")
                    .update({
                      api4com_extension: existingExt,
                      api4com_domain: master.default_domain,
                      api4com_user_id: existingUuid,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", userId);

                  await supabase
                    .from("call_operators")
                    .update({
                      extension: existingExt,
                      sip_domain: master.default_domain,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", userId);
                }

                return new Response(
                  JSON.stringify({
                    success: false,
                    error: `Usuário já existe na API4COM com Ramal ${existingExt || "desconhecido"}. Para habilitar o Webphone com áudio direto, informe o Token de Acesso da API4COM no campo abaixo.`,
                    requiresManualPasswordOrToken: true,
                    extension: existingExt,
                    domain: master.default_domain,
                    email,
                  }),
                  { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          } catch (findErr) {
            console.warn("[api4com-manage-user] Erro ao buscar usuário existente:", findErr);
          }
        }

        // Fallback: verificar se já temos o token salvo no banco de dados para este perfil
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("api4com_token, api4com_extension, api4com_domain")
          .eq("id", userId)
          .maybeSingle();

        if (existingProfile?.api4com_token) {
          return new Response(
            JSON.stringify({
              success: true,
              message: "Token já configurado e ativo no perfil.",
              token: existingProfile.api4com_token,
              extension: existingProfile.api4com_extension,
              domain: existingProfile.api4com_domain,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const friendlyMsg =
          parsedErr?.error?.message === "login failed"
            ? "Usuário já existe na API4COM com uma senha diferente. Por favor, informe a senha correta da API4COM ou cole o Token diretamente no campo."
            : `Falha ao autenticar na API4COM: ${parsedErr?.error?.message || loginErr}`;

        return new Response(
          JSON.stringify({
            success: false,
            error: friendlyMsg,
            requiresManualPasswordOrToken: true,
            email,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const loginData = await loginRes.json();
      const loginToken = loginData.id;
      api4comUserId = loginData.userId ? String(loginData.userId) : api4comUserId;

      // 3. Gerar Token de Acesso Perpétuo (ttl: -1)
      const tokenRes = await fetch("https://api.api4com.com/api/v1/users/accessTokens", {
        method: "POST",
        headers: {
          Authorization: loginToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ttl: -1, // Token perpétuo (nunca expira)
        }),
      });

      if (!tokenRes.ok) {
        // Se a rota falhar, o token do login já pode ser usado
        perpetualToken = loginToken;
      } else {
        const tokenData = await tokenRes.json();
        perpetualToken = tokenData.id || loginToken;
      }

      if (!perpetualToken) {
        throw new Error("Não foi possível gerar o token na API4COM");
      }

      // 4. Configurar SIP e Webhooks
      const { userData, sipExtension, sipDomain, sipPassword, sipIntegrationId } =
        await configureSipAndWebhook(perpetualToken);

      // 5. Salvar na tabela profiles
      const nowIso = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({
          api4com_token: perpetualToken,
          api4com_extension: sipExtension,
          api4com_domain: sipDomain,
          api4com_password: sipPassword || password,
          api4com_user_id: api4comUserId || (userData?.id ? String(userData.id) : null),
          api4com_synced_at: nowIso,
        })
        .eq("id", userId);

      // 6. Atualizar ou criar registros em call_operators para este usuário
      await supabase
        .from("call_operators")
        .update({
          api4com_token: perpetualToken,
          extension: sipExtension,
          sip_domain: sipDomain,
          sip_password: sipPassword || password,
          sip_integration_id: sipIntegrationId,
          updated_at: nowIso,
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Conta e Token API4COM criados e configurados com sucesso!",
          token: perpetualToken,
          extension: sipExtension,
          domain: sipDomain,
          user: {
            id: api4comUserId,
            name: userData?.name || name,
            email,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Ação não reconhecida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[api4com-manage-user] Erro geral:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
