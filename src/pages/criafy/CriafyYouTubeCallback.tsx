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
  if (typeof payload.companyId !== "string") throw new Error("Workspace ausente no retorno Google.");
  return payload.companyId;
}

export default function CriafyYouTubeCallback() {
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
    if (authError) { setError(`Autorização Google recusada: ${authError}`); return; }
    if (!code || !state) { setError("O Google não retornou o código de autorização."); return; }
    try {
      const companyId = companyIdFromState(state);
      criafyService.exchangeYouTubeOAuthCode(companyId, code, state)
        .then(() => navigate("/criafy?tab=contas&youtube=connected", { replace: true }))
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao conectar canal YouTube."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Retorno Google inválido.");
    }
  }, [navigate]);

  return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
    {error ? <>
      <h1 className="text-lg font-semibold">Não foi possível conectar o YouTube</h1>
      <p className="text-sm text-muted-foreground">{error}</p>
      <Link className="text-sm text-primary underline" to="/criafy?tab=contas">Voltar às contas conectadas</Link>
    </> : <><Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Concluindo a conexão com o YouTube...</p></>}
  </main>;
}
