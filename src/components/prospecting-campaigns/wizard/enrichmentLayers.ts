export type EnrichmentLayerId = "google_maps" | "website" | "instagram" | "cnpj" | "corporate_structure";

export interface EnrichmentLayerConfig {
  id: EnrichmentLayerId;
  label: string;
  status: "available" | "coming_soon";
  fields: string[];
  description: string;
}

// Enabling a future layer is just flipping `status` to "available" here --
// no UI rebuild needed, StepEnrichment.tsx renders straight from this array.
export const ENRICHMENT_LAYERS: EnrichmentLayerConfig[] = [
  {
    id: "google_maps",
    label: "Google Maps",
    status: "available",
    fields: ["Nome", "Telefone", "Endereço", "Categoria", "Avaliações", "Site"],
    description: "Extração direta do Google Maps.",
  },
  {
    id: "website",
    label: "Site da empresa",
    status: "available",
    fields: ["E-mail", "WhatsApp", "Redes sociais", "Descrição", "Serviços"],
    description: "Enriquecimento a partir do site oficial da empresa.",
  },
  {
    id: "instagram",
    label: "Instagram",
    status: "coming_soon",
    fields: ["Perfil", "Seguidores", "Publicações", "Última atividade", "Bio"],
    description: "Dados públicos do perfil no Instagram.",
  },
  {
    id: "cnpj",
    label: "CNPJ",
    status: "coming_soon",
    fields: ["Razão social", "Situação cadastral", "CNAE", "Porte", "Data de abertura"],
    description: "Consulta à Receita Federal.",
  },
  {
    id: "corporate_structure",
    label: "Quadro societário",
    status: "coming_soon",
    fields: ["Sócios", "Administradores", "Possíveis decisores"],
    description: "Identificação de decisores da empresa.",
  },
];
