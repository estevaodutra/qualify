import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(url, key);

export interface SeedSkillItem {
  slug: string;
  name: string;
  description: string;
  category: "CONTEÚDO" | "ESTRATÉGIA" | "ANÁLISE";
  when_to_use: string;
  target_objective: string;
  main_instructions: string;
  output_format: "json" | "markdown" | "text";
  output_schema: Record<string, any>;
  default_model_profile: string;
  manifest_content: string;
  files: Array<{
    path: string;
    name: string;
    type: "manifest" | "reference" | "asset" | "script";
    content: string;
    size: number;
    updatedAt: string;
  }>;
}

export const initialSkills: SeedSkillItem[] = [
  {
    slug: "reel-scriptwriter",
    name: "Roteirista de Reels",
    description: "Cria roteiros magnéticos para Reels/TikTok com gancho nos 3 primeiros segundos, alta retenção, ritmo dinâmico e chamada para ação contextual.",
    category: "CONTEÚDO",
    when_to_use: "Quando o usuário solicitar roteiro em vídeo vertical (Reels, TikTok, Shorts), gravações dinâmicas de 30 a 60 segundos.",
    target_objective: "Prender a atenção imediatamente, reter o espectador com quebras de padrão e direcionar para uma ação clara (comentário, DM, link).",
    default_model_profile: "CONTENT_ADVANCED",
    output_format: "json",
    output_schema: {
      title: "string (título interno do roteiro)",
      objective: "string (objetivo principal do vídeo)",
      hook: "string (frase de gancho para os primeiros 3 segundos)",
      script: "string (roteiro falado completo com rubricas visuais entre colchetes)",
      cta: "string (chamada para ação falada e na tela)",
      recording_notes: "string (orientações práticas de enquadramento, tom de voz e ritmo de gravação)",
      caption: "string (legenda complementar para a publicação)"
    },
    main_instructions: `Você é o Roteirista de Reels da Criafy.
Sua missão é gerar um roteiro de alta retenção para vídeo vertical (30 a 60 segundos).

REGRAS DE OURO:
1. Os primeiros 3 segundos decidem o jogo: use quebra de padrão, pergunta provocativa ou afirmação contraintuitiva.
2. Respeite rigorosamente o Manual da Marca e o Tom de Voz recebidos no Context Package.
3. Não use jargões vazios ou introduções mornas ("Olá pessoal, hoje eu vim falar..."). Vá direto ao ponto de tensão.
4. Inclua notas de gravação visuais entre colchetes, como [Corta para enquadramento fechado] ou [Mostra tela do celular].
5. Retorne estritamente o formato JSON solicitado.`,
    manifest_content: `---
name: reel-scriptwriter
title: Roteirista de Reels
category: CONTEÚDO
version: 1.0.0
description: Skill oficial Criafy para roteirização de vídeos curtos de alta conversão.
---

# Roteirista de Reels

## Objetivo
Estruturar roteiros verticais para Reels/TikTok focados em alta retenção e conversão.

## Estrutura Recomendada
1. **Gancho (0-3s)**: Quebra de padrão visual ou frase provocativa.
2. **Desenvolvimento (4-40s)**: 3 blocos de conteúdo com ritmo ágil e transições fluidas.
3. **CTA (40-60s)**: Chamada de ação simples, direta e de baixa fricção.

Consulte os arquivos em \`references/\` para técnicas de storytelling e hooks.`,
    files: [
      {
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: `---
name: reel-scriptwriter
title: Roteirista de Reels
category: CONTEÚDO
version: 1.0.0
description: Skill oficial Criafy para roteirização de vídeos curtos de alta conversão.
---

# Roteirista de Reels

## Objetivo
Estruturar roteiros verticais para Reels/TikTok focados em alta retenção e conversão.

## Estrutura Recomendada
1. **Gancho (0-3s)**: Quebra de padrão visual ou frase provocativa.
2. **Desenvolvimento (4-40s)**: 3 blocos de conteúdo com ritmo ágil e transições fluidas.
3. **CTA (40-60s)**: Chamada de ação simples, direta e de baixa fricção.

Consulte os arquivos em \`references/\` para técnicas de storytelling e hooks.`,
        size: 550,
        updatedAt: new Date().toISOString()
      },
      {
        path: "references/hooks.md",
        name: "hooks.md",
        type: "reference",
        content: `# Fórmulas de Ganchos (Hooks) de Alta Retenção

1. **O Erro Comum**: "O maior erro que 90% das pessoas cometem ao..."
2. **A Revelação Oculta**: "O que ninguém te conta sobre..."
3. **A Pergunta Incomum**: "Você já percebeu como..."
4. **Contrassenso Direto**: "Pare de fazer isso se você quer ter resultado em..."
5. **Jornada em Primeira Pessoa**: "Como eu transformei X em Y em apenas 30 dias..."`,
        size: 420,
        updatedAt: new Date().toISOString()
      },
      {
        path: "references/storytelling.md",
        name: "storytelling.md",
        type: "reference",
        content: `# Micro Storytelling em Vídeo Curto

- **Ato 1 (Situação)**: Conectar com o momento de dor ou desejo do espectador.
- **Ato 2 (Tensão/Insight)**: Explicar o porquê do problema persistir e revelar a chave de mudança.
- **Ato 3 (Solução)**: Apresentar a aplicação prática conectada à autoridade da marca.`,
        size: 380,
        updatedAt: new Date().toISOString()
      },
      {
        path: "assets/template-roteiro.md",
        name: "template-roteiro.md",
        type: "asset",
        content: `[CENA 1 - GANCHO / 0 a 3 seg]
Visual: Olhando firme para a câmera, gesticulando com ênfase.
Áudio: "..."

[CENA 2 - INSIGHT CENTRAL / 4 a 35 seg]
Visual: Mudança de ângulo / corte seco.
Áudio: "..."

[CENA 3 - CTA / 36 a 50 seg]
Visual: Sorriso de encerramento, apontando para legenda.
Áudio: "Comente X abaixo para receber o material completo."`,
        size: 360,
        updatedAt: new Date().toISOString()
      }
    ]
  },
  {
    slug: "stories-lite",
    name: "Stories Lite",
    description: "Cria narrativas leves e espontâneas de rotina (café, carro, trabalho, bastidores) que conectam o cotidiano com o método e produto da marca.",
    category: "CONTEÚDO",
    when_to_use: "Para engajar a audiência nos Stories de forma autêntica, sem tom agressivo de venda, aproveitando micro-momentos do dia.",
    target_objective: "Gerar identificação imediata, abrir conversas na DM e reforçar a autoridade através de situações práticas reais.",
    default_model_profile: "CONTENT_STANDARD",
    output_format: "json",
    output_schema: {
      context: "string (café, carro, trabalho, casa, bastidor, fim de dia)",
      trigger: "string (o fato cotidiano ou reflexão que despertou o story)",
      hook: "string (primeira fala ou enquete para o Story inicial)",
      bridge: "string (a transição inteligente entre o fato cotidiano e o aprendizado/marca)",
      message: "string (a mensagem principal com lição prática)",
      method_connection: "string (como isso comprova o método ou benefício do produto)",
      cta: "string (pergunta, caixa de perguntas ou convite para responder)",
      script: "string (roteiro sequencial pronto para gravar ou digitar nos Stories)"
    },
    main_instructions: `Você é o especialista em Stories Lite da Criafy.
Sua missão é criar narrativas leves para os Stories que pareçam 100% naturais e espontâneas.

DIRETRIZES:
1. Escolha ou utilize o contexto da rotina indicado (Café, Carro, Mesa de Trabalho, Bastidores, Final de Expediente).
2. Construa uma ponte invisível: o assunto começa com algo corriqueiro e termina com um insight valioso ligado ao posicionamento.
3. Não use linguagem engessada ou corporativa. Deve soar como um áudio enviado para um amigo próximo.
4. Sempre sugira um elemento de interação (Caixinha, Enquete, Resposta na DM).
5. Retorne estritamente o formato JSON solicitado.`,
    manifest_content: `---
name: stories-lite
title: Stories Lite
category: CONTEÚDO
version: 1.0.0
description: Criação de oportunidades de comunicação fluida e contextual na rotina.
---

# Stories Lite

Transforma momentos normais do dia em conexões estratégicas de posicionamento.`,
    files: [
      {
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: `# Stories Lite\n\nTransforma rotina em relacionamento autêntico e vendas orgânicas.`,
        size: 150,
        updatedAt: new Date().toISOString()
      },
      {
        path: "references/contextos-rotina.md",
        name: "contextos-rotina.md",
        type: "reference",
        content: `### Contextos Válidos:
- **Café**: Começo de dia, planejamento mental, alinhamento de prioridades.
- **Carro**: Reflexão pós-reunião ou caminho para compromisso.
- **Mesa de trabalho**: Resolução de um desafio técnico real, bastidores de projeto.
- **Casa/Família**: Equilíbrio de rotina, limites saudáveis.
- **Fim do dia**: Balanço do dia, aprendizado do dia.`,
        size: 320,
        updatedAt: new Date().toISOString()
      }
    ]
  },
  {
    slug: "static-post-writer",
    name: "Post Estático",
    description: "Criação de postagens de imagem única de alto impacto (tweet card, gráfico, frase ou foto com gancho) e legenda magnética.",
    category: "CONTEÚDO",
    when_to_use: "Posts de feed de imagem única focados em posicionamento forte, salvamentos e compartilhamentos rápidos.",
    target_objective: "Transmitir um conceito claro em segundos e aprofundar na legenda com grande densidade de valor.",
    default_model_profile: "CONTENT_STANDARD",
    output_format: "json",
    output_schema: {
      headline: "string (frase principal da imagem ou tweet card)",
      visual_concept: "string (orientação de design visual da imagem)",
      caption: "string (legenda formatada com quebra de linhas para leitura rápida)",
      hashtags: ["string"],
      cta: "string (chamada para ação final)"
    },
    main_instructions: `Você é o redator de Posts Estáticos da Criafy.
Sua missão é criar um conceito visual forte e uma legenda impecável para um post estático de feed.

REGRAS:
- A headline na imagem deve ter no máximo 12 palavras, com altíssimo impacto emocional ou cognitivo.
- A legenda deve ter excelente escaneabilidade (parágrafos curtos, emojis moderados, sem blocos densos de texto).
- Retorne estritamente o formato JSON solicitado.`,
    manifest_content: `# Post Estático\n\nPosts de imagem única para autoridade e salvamentos.`,
    files: [
      {
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: `# Post Estático\n\nDiretrizes de copy e conceito visual.`,
        size: 120,
        updatedAt: new Date().toISOString()
      }
    ]
  },
  {
    slug: "carousel-writer",
    name: "Carrossel",
    description: "Estruturação de carrosséis educativos de 5 a 10 lâminas com retenção deslize a deslize, quebra de crenças e alto índice de salvamento.",
    category: "CONTEÚDO",
    when_to_use: "Quando for necessário ensinar um passo a passo, desmistificar um conceito ou apresentar um guia detalhado.",
    target_objective: "Garantir que a pessoa deslize até o último slide e salve o post para consultar depois.",
    default_model_profile: "CONTENT_ADVANCED",
    output_format: "json",
    output_schema: {
      cover_headline: "string (título forte da capa)",
      cover_subheadline: "string (subtítulo complementar que gera curiosidade)",
      slides: [
        {
          slide_number: 1,
          title: "string",
          content: "string",
          visual_cue: "string"
        }
      ],
      caption: "string (legenda de suporte)",
      cta: "string (chamada no slide final)"
    },
    main_instructions: `Você é o especialista em Carrosséis da Criafy.
Construa uma narrativa contínua onde cada slide instiga a passar para o próximo.
Retorne estritamente o formato JSON solicitado.`,
    manifest_content: `# Carrossel\n\nEstruturação de carrosséis educativos de alta retenção.`,
    files: [
      {
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: `# Carrossel\n\nEstruturação de carrosséis educativos de alta retenção.`,
        size: 120,
        updatedAt: new Date().toISOString()
      }
    ]
  },
  {
    slug: "editorial-planner",
    name: "Planejamento Editorial",
    description: "Criação de calendários semanais de conteúdo balanceados entre formatos (Reels, Carrossel, Posts, Stories) e pilares estratégicos.",
    category: "ESTRATÉGIA",
    when_to_use: "Para estruturar a pauta semanal ou mensal de publicações alinhada às metas da marca.",
    target_objective: "Garantir cadência consistente, variedade temática e equilíbrio entre atração, nutrição e conversão.",
    default_model_profile: "STRATEGY_ADVANCED",
    output_format: "json",
    output_schema: {
      week_theme: "string (tema central ou meta da semana)",
      strategic_goal: "string (ex: gerar leads, autoridade em método, aquecimento)",
      items: [
        {
          day: "string (Segunda, Terça, etc.)",
          format: "string (REEL, CAROUSEL, POST, STORIES_LITE)",
          theme: "string (pauta específica)",
          pillar: "string (autoridade, conexão, método, bastidores)",
          objective: "string",
          angle: "string",
          hook_idea: "string"
        }
      ]
    },
    main_instructions: `Você é o estrategista de Planejamento Editorial da Criafy.
Sua missão é planejar uma sequência semanal inteligente de publicações considerando os pilares e as diretrizes do Manual da Marca.
Retorne estritamente o formato JSON solicitado.`,
    manifest_content: `# Planejamento Editorial\n\nCalendário e pautas estratégicas de conteúdo.`,
    files: [
      {
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: `# Planejamento Editorial\n\nOrganização de pautas e calendários semanais.`,
        size: 130,
        updatedAt: new Date().toISOString()
      }
    ]
  },
  {
    slug: "digital-strategist",
    name: "Estrategista Digital",
    description: "Diagnóstico profundo de presença digital, análise de posicionamento, recomendação de ajustes de tom e estratégias de crescimento.",
    category: "ESTRATÉGIA",
    when_to_use: "Consultoria estratégica, auditoria de marca, definição de diferenciais competitivos e respostas a dúvidas de posicionamento.",
    target_objective: "Dar clareza tática de longo prazo para a marca se destacar no mercado.",
    default_model_profile: "STRATEGY_ADVANCED",
    output_format: "json",
    output_schema: {
      diagnosis: "string (leitura diagnóstica do momento e do posicionamento)",
      recommendations: [
        {
          area: "string (Conteúdo, Posicionamento, Conversão, Audiência)",
          action: "string (ação recomendada)",
          expected_impact: "string",
          priority: "string (Alta, Média, Baixa)"
        }
      ],
      next_steps: ["string"],
      summary: "string (resumo executivo com direcionamento claro)"
    },
    main_instructions: `Você é o Estrategista Digital Chefe da Criafy.
Forneça recomendações práticas, embasadas e de alto valor, sem rodeios ou superficialidade.
Retorne estritamente o formato JSON solicitado.`,
    manifest_content: `# Estrategista Digital\n\nConsultoria de posicionamento e crescimento da marca.`,
    files: [
      {
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: `# Estrategista Digital\n\nDiagnóstico de posicionamento e crescimento de marca.`,
        size: 140,
        updatedAt: new Date().toISOString()
      }
    ]
  }
];

async function seed() {
  console.log("Seeding Criafy AI Skills...");
  for (const item of initialSkills) {
    // 1. Inserir ou atualizar a Skill
    const { data: skill, error: skillErr } = await supabase
      .from("ai_skills")
      .upsert(
        {
          slug: item.slug,
          name: item.name,
          description: item.description,
          category: item.category,
          when_to_use: item.when_to_use,
          target_objective: item.target_objective,
          main_instructions: item.main_instructions,
          output_format: item.output_format,
          output_schema: item.output_schema,
          default_model_profile: item.default_model_profile,
          status: "published",
          openai_skill_id: `skill_${item.slug.replace(/-/g, "_")}`,
          openai_default_version: "v1.0.0",
          openai_latest_version: "v1.0.0",
          updated_at: new Date().toISOString()
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (skillErr || !skill) {
      console.error(`Erro ao criar skill ${item.slug}:`, skillErr);
      continue;
    }

    // 2. Inserir Versão 1
    const { data: versionRow, error: verErr } = await supabase
      .from("ai_skill_versions")
      .upsert(
        {
          skill_id: skill.id,
          version: 1,
          openai_version: "v1.0.0",
          manifest_content: item.manifest_content,
          files: item.files,
          changelog: "Versão inicial publicada pela Criafy",
          status: "published",
          published_at: new Date().toISOString()
        },
        { onConflict: "skill_id,version" }
      )
      .select("id")
      .single();

    if (verErr || !versionRow) {
      console.error(`Erro ao criar versão da skill ${item.slug}:`, verErr);
      continue;
    }

    // 3. Atualizar active_version_id
    await supabase
      .from("ai_skills")
      .update({ active_version_id: versionRow.id })
      .eq("id", skill.id);

    console.log(`✓ Skill configurada: ${item.name} (${item.slug}) [v1]`);
  }
  console.log("Seeds concluídos com sucesso!");
}

seed().catch(console.error);
