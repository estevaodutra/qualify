import { useEffect, useRef } from "react";
import { criafyService } from "@/services/criafy/criafyService";
import { toast } from "sonner";

/**
 * Hook de execução contínua em segundo plano:
 * Verifica e dispara automaticamente publicações que atingiram o horário agendado.
 */
export function useCriafyAutoScheduler(
  companyId?: string,
  onPublicationsChanged?: () => void
) {
  const isRunningRef = useRef(false);

  const checkAndPublishDue = async () => {
    if (!companyId || isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      // 1. Tenta acionar o worker de scheduler da Vercel
      const res = await fetch("/api/criafy-scheduler-worker", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.publishedCount > 0) {
          toast.success(
            `${data.publishedCount} publicação(ões) agendada(s) foram publicadas no Instagram agora!`,
            { duration: 5000 }
          );
          onPublicationsChanged?.();
        }
      } else {
        // Fallback direto via Supabase se o endpoint local da Vercel não responder (ex: em dev local)
        const pubs = await criafyService.getPublications(companyId);
        const now = new Date();
        const duePubs = pubs.filter(
          (p) =>
            p.status === "SCHEDULED" &&
            p.scheduled_at &&
            new Date(p.scheduled_at) <= now
        );

        for (const pub of duePubs) {
          try {
            await criafyService.publishNow(pub.id);
            toast.success(`Publicação agendada (@${pub.account?.username || "Instagram"}) enviada com sucesso!`);
            onPublicationsChanged?.();
          } catch (err: any) {
            console.error("Erro ao publicar post agendado vencido:", err);
          }
        }
      }
    } catch (err) {
      // Erro silencioso para não incomodar o usuário na navegação normal
      console.warn("[AutoScheduler] Erro na checagem periódica:", err);
    } finally {
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    if (!companyId) return;

    // Checagem imediata ao entrar no Criafy
    checkAndPublishDue();

    // Checagem a cada 45 segundos
    const interval = setInterval(checkAndPublishDue, 45000);

    // Checagem ao voltar o foco para a aba do navegador
    const onFocus = () => checkAndPublishDue();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [companyId]);

  return { triggerCheckNow: checkAndPublishDue };
}
