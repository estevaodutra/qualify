import { CriafyInstagramAccount } from "@/types/criafy";

export interface CriafyOAuthExchangeResult {
  success: true;
  count: number;
  accounts: CriafyInstagramAccount[];
}

export function validateOAuthExchangeResult(data: unknown): CriafyOAuthExchangeResult {
  if (!data || typeof data !== "object") {
    throw new Error("Erro ao processar autorização da Meta.");
  }

  const result = data as Record<string, unknown>;
  if (result.success !== true) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Erro ao processar autorização da Meta."
    );
  }
  if (!Number.isInteger(result.count) || (result.count as number) < 1) {
    throw new Error("A Meta autorizou o acesso, mas nenhuma conta do Instagram foi conectada.");
  }
  if (!Array.isArray(result.accounts) || result.accounts.length !== result.count) {
    throw new Error("A resposta da integração do Instagram está incompleta.");
  }
  return data as CriafyOAuthExchangeResult;
}
