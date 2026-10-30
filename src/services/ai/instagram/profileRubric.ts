/**
 * profileRubric.ts
 * Matriz de 12 itens para auditar o perfil do Instagram (pontuação máxima: 100).
 */

export interface ProfileRubricItem {
  id: string;
  category: "IDENTIDADE" | "BIO" | "CONVERSÃO" | "CONTEÚDO";
  name: string;
  points: number;
  criteria: string;
  fix: string;
}

export const PROFILE_RUBRIC: ProfileRubricItem[] = [
  {
    id: "handle",
    category: "IDENTIDADE",
    name: "Nome de Usuário (@handle)",
    points: 10,
    criteria: "Simples, fácil de memorizar, sem excesso de números, pontos ou underlines repetidos.",
    fix: "Remova caracteres especiais supérfluos e adote um nome direto e reconhecível."
  },
  {
    id: "name_field",
    category: "IDENTIDADE",
    name: "Campo Nome (SEO da Busca)",
    points: 10,
    criteria: "Contém a profissão ou palavra-chave buscada pelo cliente além do nome pessoal.",
    fix: "Adicione seu nicho ou função no campo Nome (ex: 'Seu Nome | Gestão de Tráfego B2B')."
  },
  {
    id: "photo",
    category: "IDENTIDADE",
    name: "Foto de Perfil",
    points: 10,
    criteria: "Rosto iluminado, fundo contrastante, sem ruídos visuais, olhar para a câmera ou logo nítida.",
    fix: "Use uma foto profissional com iluminação frontal e fundo contrastante."
  },
  {
    id: "who_for",
    category: "BIO",
    name: "Para Quem É (ICP)",
    points: 10,
    criteria: "A primeira linha diz imediatamente para quem a conta foi feita.",
    fix: "Especifique o público exato nos primeiros 5 segundos de leitura da bio."
  },
  {
    id: "value_prop",
    category: "BIO",
    name: "Proposta de Valor / Transformação",
    points: 10,
    criteria: "Diz o que o cliente conquista ou resolve (sem frases motivacionais genéricas).",
    fix: "Substitua frases abstratas pelo benefício concreto do seu método ou produto."
  },
  {
    id: "proof",
    category: "BIO",
    name: "Autoridade / Prova Concreta",
    points: 10,
    criteria: "Número verificável (clientes atendidos, faturamento gerado, anos de atuação, alunos).",
    fix: "Inclua um número real que comprove sua experiência ou resultado dos clientes."
  },
  {
    id: "cta",
    category: "CONVERSÃO",
    name: "Chamada para Ação (CTA na Bio)",
    points: 10,
    criteria: "Instrui exatamente onde clicar ou qual palavra mandar na DM.",
    fix: "Adicione uma linha final apontando para o link (ex: 'Receba o diagnóstico abaixo 👇')."
  },
  {
    id: "link",
    category: "CONVERSÃO",
    name: "Link da Bio Direto",
    points: 10,
    criteria: "Leva diretamente para a ação principal sem árvores de links confusas com 10 opções.",
    fix: "Mantenha no máximo 1 ou 2 botões principais na sua página de destino."
  },
  {
    id: "highlights",
    category: "CONVERSÃO",
    name: "Destaques Estruturados",
    points: 10,
    criteria: "Destaques cobrem Comece Aqui, Método/Serviços, Depoimentos e Resultados.",
    fix: "Organize 4 a 5 pastas de destaques com capas limpas e títulos de 1 palavra."
  },
  {
    id: "pinned_posts",
    category: "CONTEÚDO",
    name: "3 Posts Fixados",
    points: 10,
    criteria: "Fixados cobrem: 1. Quem sou/Método, 2. Estudo de caso/Maior prova, 3. Oferta/Como contratar.",
    fix: "Fixe no topo exatamente os 3 posts que vendem e geram autoridade imediata."
  }
];

export function calculateProfileScore(checkedIds: string[]): {
  score: number;
  missingItems: ProfileRubricItem[];
  achievedItems: ProfileRubricItem[];
} {
  const achievedItems = PROFILE_RUBRIC.filter((item) => checkedIds.includes(item.id));
  const missingItems = PROFILE_RUBRIC.filter((item) => !checkedIds.includes(item.id));
  const score = achievedItems.reduce((acc, item) => acc + item.points, 0);

  return { score, missingItems, achievedItems };
}
