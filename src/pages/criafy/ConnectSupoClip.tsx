import { useEffect, useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";

const SUPOCLIP_ORIGIN = "https://supoclip.d2x.site";
type Account = {
  id: string;
  provider: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  display_name: string;
  connection_status: string;
};

export default function ConnectSupoClip() {
  const { companies, isLoading } = useCompany();
  const [companyId, setCompanyId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const state = new URLSearchParams(window.location.search).get("state") || "";

  useEffect(() => {
    if (!companyId && companies.length) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setAccounts([]);
    setSelected([]);
    setError("");
    void (async () => {
      const { data, error: loadError } = await supabase
        .from("criafy_social_accounts")
        .select("id,provider,display_name,connection_status")
        .eq("company_id", companyId)
        .eq("connection_status", "CONNECTED")
        .order("display_name");
      if (cancelled) return;
      if (loadError) setError("Não foi possível carregar as contas deste workspace.");
      else setAccounts((data || []) as Account[]);
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const connect = async () => {
    if (!window.opener || !state || !/^[a-f0-9-]{36}$/i.test(state)) {
      setError("Abra esta janela pelo SupoClip para conectar as contas.");
      return;
    }
    if (!companyId || !selected.length) return;
    setSending(true);
    setError("");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    let activeSession = session;
    if (!sessionError && (!session?.access_token ||
        (session.expires_at || 0) * 1000 < Date.now() + 30 * 60_000)) {
      const refreshed = await supabase.auth.refreshSession();
      activeSession = refreshed.error ? null : refreshed.data.session;
    }
    if (sessionError || !activeSession?.access_token) {
      setError("Sua sessão expirou. Entre novamente na Qualify.");
      setSending(false);
      return;
    }
    // The SupoClip server revalidates the token, membership and every account
    // against Qualify's RLS before persisting the selection. No social token is sent.
    window.opener.postMessage({
      type: "qualify:account-selection",
      state,
      companyId,
      accountIds: selected,
      accessToken: activeSession.access_token,
    }, SUPOCLIP_ORIGIN);
    setSending(false);
    window.close();
  };

  return (
    <main className="mx-auto max-w-lg p-6 space-y-5">
      <h1 className="text-xl font-semibold">Conectar contas ao SupoClip</h1>
      <p className="text-sm text-muted-foreground">Escolha o workspace e as contas que poderão aparecer no SupoClip. As senhas e os tokens das redes continuam na Qualify.</p>
      {isLoading ? <p>Carregando workspaces...</p> : (
        <label className="block space-y-1 text-sm">
          <span>Workspace</span>
          <select className="w-full rounded-md border p-2" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </label>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium">Contas disponíveis</p>
        {accounts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta conectada neste workspace.</p>}
        {accounts.map((account) => (
          <label key={account.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
            <input type="checkbox" checked={selected.includes(account.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, account.id] : selected.filter((id) => id !== account.id))} />
            <span>{account.display_name}</span>
            <span className="ml-auto text-xs text-muted-foreground">{account.provider}</span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="button" disabled={sending || !selected.length} onClick={connect} className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
        {sending ? "Conectando..." : `Conectar ${selected.length || ""} conta${selected.length === 1 ? "" : "s"}`}
      </button>
    </main>
  );
}
