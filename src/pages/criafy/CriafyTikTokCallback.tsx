import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { criafyService } from "@/services/criafy/criafyService";

function companyIdFromState(state: string): string {
  const encoded = state.split(".")[0];
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof payload.companyId !== "string") throw new Error("Workspace ausente no retorno TikTok.");
  return payload.companyId;
}

export default function CriafyTikTokCallback() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const authError = params.get("error_description") || params.get("error");
    window.history.replaceState(null, "", window.location.pathname);

    if (authError) {
      setError(`Autorização TikTok recusada: ${authError}`);
      return;
    }
    if (!code || !state) {
      setError("O TikTok não retornou o código de autorização. Tente conectar novamente.");
      return;
    }

    try {
      const companyId = companyIdFromState(state);
      criafyService.exchangeTikTokOAuthCode(companyId, code, state)
        .then(() => navigate("/criafy?tab=contas&tiktok=connected", { replace: true }))
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao conectar conta TikTok."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Retorno TikTok inválido.");
    }
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <h1 className="text-lg font-semibold">Não foi possível conectar o TikTok</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link className="text-sm text-primary underline" to="/criafy?tab=contas">Voltar às contas conectadas</Link>
        </>
      ) : (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Concluindo a conexão com o TikTok...</p>
        </>
      )}
    </main>
  );
}
