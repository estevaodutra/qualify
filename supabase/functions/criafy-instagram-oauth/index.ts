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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, companyId, accountId, code, state, redirectUri, provider = "INSTAGRAM" } = body;

    // Verify company membership
    if (companyId) {
      const { data: member } = await adminClient
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!member) {
        throw new Error("Forbidden: User is not an active member of this company");
      }
    }

    // App Credentials com separação entre Instagram App e Meta App
    const instagramAppId =
      Deno.env.get("INSTAGRAM_APP_ID") || "1214753054314021";
    let instagramAppSecret =
      Deno.env.get("INSTAGRAM_APP_SECRET") || Deno.env.get("META_APP_SECRET") || "";

    // Fallback: se não estiver no env do container, buscar em platform_settings no banco
    if (!instagramAppSecret) {
      try {
        const { data: settingRow } = await adminClient
          .from("platform_settings")
          .select("value")
          .in("key", ["instagram_app_secret", "meta_app_secret", "criafy_instagram_app_secret"])
          .limit(1)
          .maybeSingle();

        if (settingRow && settingRow.value) {
          instagramAppSecret = typeof settingRow.value === "string"
            ? settingRow.value
            : String(settingRow.value?.secret || settingRow.value?.value || settingRow.value);
        }
      } catch (dbErr: any) {
        console.warn("[OAuth] Erro ao buscar secret em platform_settings:", dbErr.message);
      }
    }

    const metaAppId = Deno.env.get("META_APP_ID") || instagramAppId;
    const metaAppSecret = Deno.env.get("META_APP_SECRET") || instagramAppSecret;

    // ==========================================
    // ACTION 1: Generate OAuth URL (Instagram Login Direto ou Facebook Login)
    // ==========================================
    if (action === "get-auth-url") {
      const statePayload = JSON.stringify({ companyId, userId: user.id, timestamp: Date.now() });

      if (provider === "INSTAGRAM") {
        // Escopos modernos do Instagram Login for Business
        const igScopes = [
          "instagram_business_basic",
          "instagram_business_manage_messages",
          "instagram_business_manage_comments",
          "instagram_business_content_publish",
        ].join(",");

        const cleanRedirectUri = String(redirectUri).replace(/#_.*$/, "").replace(/#.*$/, "").trim();
        const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${instagramAppId}&redirect_uri=${encodeURIComponent(
          cleanRedirectUri
        )}&response_type=code&scope=${igScopes}&state=${encodeURIComponent(statePayload)}`;

        return new Response(JSON.stringify({ success: true, authUrl, provider: "INSTAGRAM" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Fallback legado via Facebook Login com Páginas
        const fbScopes = [
          "instagram_basic",
          "instagram_content_publish",
          "pages_show_list",
          "pages_read_engagement",
          "business_management",
        ].join(",");

        const cleanRedirectUri = String(redirectUri).replace(/#_.*$/, "").replace(/#.*$/, "").trim();
        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(
          cleanRedirectUri
        )}&scope=${fbScopes}&state=${encodeURIComponent(statePayload)}&response_type=code`;

        return new Response(JSON.stringify({ success: true, authUrl, provider: "FACEBOOK" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ==========================================
    // ACTION 2: Exchange Code for Long-Lived Token & Register Accounts
    // ==========================================
    if (action === "exchange-code") {
      if (!code || !redirectUri) throw new Error("Code and redirectUri are required");

      if (!instagramAppSecret) {
        throw new Error(
          "A Chave Secreta do Aplicativo Meta (App Secret) não está configurada no sistema. Acesse o painel Superadmin (/admin/criafy) e informe o App Secret para habilitar a conexão."
        );
      }

      // Validar state para proteção CSRF
      if (state) {
        try {
          const parsedState = typeof state === "string" ? JSON.parse(state) : state;
          if (parsedState.companyId && parsedState.companyId !== companyId) {
            throw new Error("CSRF check failed: company mismatch");
          }
        } catch (e: any) {
          console.warn("[OAuth] State parsing warning:", e.message);
        }
      }

      // Sanitizar code (remover fragmentos como #_ anexados pelo Instagram)
      const cleanCode = String(code).replace(/#_.*$/, "").replace(/#.*$/, "").trim();
      const cleanRedirectUri = String(redirectUri).replace(/#_.*$/, "").replace(/#.*$/, "").trim();

      const connectedAccounts = [];
      let lastErrorMessage = "";

      // Tentativa 1: Fluxo Direto do Instagram Login
      let isInstagramDirect = false;
      try {
        const formData = new URLSearchParams();
        formData.append("client_id", instagramAppId);
        formData.append("client_secret", instagramAppSecret);
        formData.append("grant_type", "authorization_code");
        formData.append("redirect_uri", cleanRedirectUri);
        formData.append("code", cleanCode);

        console.log(`[OAuth] Trocando code com Instagram API para app ${instagramAppId}`);
        const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
          method: "POST",
          body: formData,
        });

        const tokenData = await tokenRes.json();
        console.log("[OAuth] Resposta Instagram token:", JSON.stringify({
          hasToken: Boolean(tokenData.access_token),
          userId: tokenData.user_id,
          error: tokenData.error_message || tokenData.error?.message || null,
        }));

        if (tokenData.error_message || tokenData.error) {
          lastErrorMessage = tokenData.error_message || tokenData.error?.message || "Erro desconhecido na Meta API";
        }

        if (tokenData.access_token && tokenData.user_id) {
          isInstagramDirect = true;
          const shortLivedToken = tokenData.access_token;
          const igUserId = String(tokenData.user_id);

          // Troca por Long-Lived Token (60 dias) no endpoint do Instagram
          let longLivedToken = shortLivedToken;
          let expiresInSeconds = 5184000;

          if (instagramAppSecret) {
            try {
              const longRes = await fetch(
                `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramAppSecret}&access_token=${shortLivedToken}`
              );
              const longData = await longRes.json();
              if (longData.access_token) {
                longLivedToken = longData.access_token;
                expiresInSeconds = longData.expires_in || 5184000;
              }
            } catch (longErr: any) {
              console.warn("[OAuth] Erro ao trocar por Long-Lived Token:", longErr.message);
            }
          }

          const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

          // Buscar dados do perfil do Instagram
          let username = `ig_${igUserId}`;
          let name = null;
          let profilePic = null;

          try {
            const profileRes = await fetch(
              `https://graph.instagram.com/v22.0/me?fields=user_id,username,name,profile_picture_url&access_token=${longLivedToken}`
            );
            const profileData = await profileRes.json();
            if (profileData.username) {
              username = profileData.username;
              name = profileData.name || profileData.username;
              profilePic = profileData.profile_picture_url || null;
            } else {
              // Fallback sem versão fixa
              const fbProfileRes = await fetch(
                `https://graph.instagram.com/me?fields=user_id,username,name,profile_picture_url&access_token=${longLivedToken}`
              );
              const fbProfileData = await fbProfileRes.json();
              if (fbProfileData.username) {
                username = fbProfileData.username;
                name = fbProfileData.name || fbProfileData.username;
                profilePic = fbProfileData.profile_picture_url || null;
              }
            }
          } catch (profileErr: any) {
            console.warn("[OAuth] Erro ao buscar perfil:", profileErr.message);
          }

          // Salvar ou atualizar na tabela criafy_instagram_accounts
          const { data: inserted, error: insertErr } = await adminClient
            .from("criafy_instagram_accounts")
            .upsert(
              {
                company_id: companyId,
                instagram_account_id: igUserId,
                instagram_user_id: igUserId,
                username,
                name: name || username,
                profile_picture_url: profilePic,
                account_type: "INSTAGRAM_BUSINESS",
                access_token: longLivedToken,
                token_expires_at: tokenExpiresAt,
                connection_status: "CONNECTED",
                error_message: null,
                created_by: user.id,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "company_id, instagram_account_id" }
            )
            .select()
            .single();

          if (insertErr) {
            console.error("[OAuth] Erro ao persistir conta no PostgreSQL:", insertErr);
            throw new Error(`Erro ao salvar conta do Instagram no banco: ${insertErr.message}`);
          }

          if (inserted) {
            connectedAccounts.push(inserted);
          }
        }
      } catch (igErr: any) {
        console.warn("[OAuth] Fluxo direto Instagram falhou:", igErr.message);
        if (!lastErrorMessage) lastErrorMessage = igErr.message;
      }

      // Tentativa 2: Fallback para o fluxo do Facebook Login
      if (!isInstagramDirect && connectedAccounts.length === 0) {
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&client_secret=${metaAppSecret}&code=${code}`;

        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          throw new Error(`Meta OAuth Error: ${tokenData.error.message}`);
        }

        const shortLivedToken = tokenData.access_token;

        const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${metaAppId}&client_secret=${metaAppSecret}&fb_exchange_token=${shortLivedToken}`;
        const longLivedRes = await fetch(longLivedUrl);
        const longLivedData = await longLivedRes.json();

        const accessToken = longLivedData.access_token || shortLivedToken;
        const expiresInSeconds = longLivedData.expires_in || 5184000;
        const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (pagesData.data && Array.isArray(pagesData.data)) {
          for (const page of pagesData.data) {
            if (page.instagram_business_account) {
              const igAcc = page.instagram_business_account;

              const { data: inserted, error: insertErr } = await adminClient
                .from("criafy_instagram_accounts")
                .upsert(
                  {
                    company_id: companyId,
                    instagram_account_id: igAcc.id,
                    username: igAcc.username,
                    name: igAcc.name || page.name,
                    profile_picture_url: igAcc.profile_picture_url,
                    access_token: accessToken,
                    token_expires_at: tokenExpiresAt,
                    connection_status: "CONNECTED",
                    error_message: null,
                    created_by: user.id,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "company_id, instagram_account_id" }
                )
                .select()
                .single();

              if (!insertErr && inserted) {
                connectedAccounts.push(inserted);
              }
            }
          }
        }
      }

      if (connectedAccounts.length === 0) {
        const errorMsg = lastErrorMessage
          ? `Falha ao autorizar conta no Instagram: ${lastErrorMessage}`
          : "Nenhuma conta do Instagram foi identificada ou conectada. Certifique-se de que a conta @fornecedor.dutra está autorizada como testador no aplicativo da Meta.";
        throw new Error(errorMsg);
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: connectedAccounts.length,
          accounts: connectedAccounts,
          provider: isInstagramDirect ? "INSTAGRAM" : "FACEBOOK",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: Gestão do App Secret (Superadmin)
    // ==========================================
    if (action === "save-meta-secret") {
      const { secret } = body;
      if (!secret || typeof secret !== "string" || secret.trim().length < 8) {
        throw new Error("Secret inválido. O App Secret deve ter pelo menos 8 caracteres.");
      }

      const { error: upsertErr } = await adminClient
        .from("platform_settings")
        .upsert(
          {
            key: "instagram_app_secret",
            value: secret.trim(),
            description: "Meta Instagram App Secret para Criafy OAuth",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (upsertErr) throw upsertErr;

      return new Response(
        JSON.stringify({ success: true, message: "App Secret salvo com sucesso no banco de dados." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-meta-secret-status") {
      const isConfigured = Boolean(instagramAppSecret && instagramAppSecret.length > 5);
      const masked = isConfigured
        ? "••••••••••••" + instagramAppSecret.slice(-4)
        : null;

      return new Response(
        JSON.stringify({ success: true, isConfigured, maskedSecret: masked }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION 3: Verify Token Health & Connection Status
    // ==========================================
    if (action === "check-token-status") {
      if (!accountId) throw new Error("AccountId is required");

      const { data: account, error: fetchErr } = await adminClient
        .from("criafy_instagram_accounts")
        .select("*")
        .eq("id", accountId)
        .single();

      if (fetchErr || !account) throw new Error("Account not found");

      if (!account.access_token) {
        await adminClient
          .from("criafy_instagram_accounts")
          .update({ connection_status: "DISCONNECTED", error_message: "Access token ausente" })
          .eq("id", accountId);

        return new Response(
          JSON.stringify({ success: true, status: "DISCONNECTED", valid: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Testar endpoint do Instagram ou Graph
      let debugRes = await fetch(
        `https://graph.instagram.com/v19.0/me?access_token=${account.access_token}`
      );
      let debugData = await debugRes.json();

      if (debugData.error) {
        // Fallback Graph Facebook
        debugRes = await fetch(
          `https://graph.facebook.com/v19.0/me?access_token=${account.access_token}`
        );
        debugData = await debugRes.json();
      }

      let status = "CONNECTED";
      let errorMsg = null;

      if (debugData.error) {
        status = "EXPIRED";
        errorMsg = debugData.error.message;
      }

      await adminClient
        .from("criafy_instagram_accounts")
        .update({
          connection_status: status,
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      return new Response(
        JSON.stringify({ success: true, status, valid: !debugData.error, error: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION 4: Disconnect Account Token
    // ==========================================
    if (action === "disconnect-account") {
      if (!accountId) throw new Error("AccountId is required");

      await adminClient
        .from("criafy_instagram_accounts")
        .update({
          connection_status: "DISCONNECTED",
          access_token: null,
          error_message: "Desconectado manualmente pelo usuário",
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Invalid action: ${action}`);
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
