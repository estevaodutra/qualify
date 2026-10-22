/**
 * Módulo Comercial: FUNIL X1 (Seções 8 e 9 + Seção 02 Master Prompt).
 * - Gráfico de Funil com representação visual própria, conectada e progressiva
 * - Pipeline totalmente flexível e editável (+ Adicionar, Editar, Reordenar, Excluir com realocação)
 * - Taxas de conversão inter-etapas e indicadores reais
 */

import React from "react";
import { ConnectedProgressiveFunnel } from "../funnel/ConnectedProgressiveFunnel";
import { useSprintOSStore } from "../../state/sprintOsStore";

export const FunnelView: React.FC = () => {
  const { workspace } = useSprintOSStore();

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Esteira Visual Conectada e Progressiva com Gestão Completa */}
      <ConnectedProgressiveFunnel compact={false} />
    </div>
  );
};

