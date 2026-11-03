export interface InstagramHookFormula {
  id: number;
  name: string;
  template: string;
  example: string;
  on_screen: string;
  best_for: string;
  trap: string;
  match: string;
}

export const INSTAGRAM_HOOK_RULES = [
  "Escreva a fala dita no vídeo e a linha na tela separadamente. Na tela deve ser mais curta e direta, com 6 palavras ou menos.",
  "Sem enrolação nos primeiros 3 segundos. O vídeo começa onde normalmente começaria no segundo 6.",
  "Diga números específicos. 'Muito' ou 'bastante tempo' não são números.",
  "O primeiro frame é um gancho visual. Uma cabeça estática falando sem movimento nem texto perde 3 segundos de retenção.",
  "Se o gancho servir para qualquer concorrente do seu nicho, não é seu. Coloque a especificidade que só a sua marca tem.",
  "O gancho promete algo. Entregue o que prometeu antes da metade do vídeo ou a retenção despenca.",
];

export const HOOK_CLASSIFY_ORDER = [
  1, 23, 5, 4, 3, 15, 20, 7, 9, 26, 25, 24, 18, 17, 8, 6, 16, 12, 10, 2, 13, 19, 21, 22, 11, 14
];

export const INSTAGRAM_HOOK_FORMULAS: InstagramHookFormula[] = [
  {
    id: 1,
    name: "Cost Confession",
    template: "{Valor específico} foi o que {um erro} me custou.",
    example: "R$ 18.000 foi o que uma cláusula ausente no contrato me custou.",
    on_screen: "ERRO DE R$ 18.000",
    best_for: "Construir confiança rápido. As pessoas assistem até o final quando você expõe um erro real seu.",
    trap: "Custo genérico ou emocional. 'Custou minha paz' não gera o mesmo impacto imediato que um número real.",
    match: "(?:\\$|r\\$)\\s?\\d[\\d,.]*\\s+(?:foi|is|was) o que|custou(?:-me| me| para| nos)?|perdi[^.!?]{0,20}(?:\\$|r\\$)\\s?\\d|\\blost\\b[^.!?]{0,20}\\$\\s?\\d",
  },
  {
    id: 2,
    name: "Negative Command",
    template: "Pare de {ação comum}. Faça {alternativa} em vez disso.",
    example: "Pare de postar 3 vezes por dia. Poste 2 vezes e responda a todos os comentários por 1 hora.",
    on_screen: "PARE DE POSTAR TODO DIA",
    best_for: "Salvamentos e debates. O comando imperativo atrai atenção imediata.",
    trap: "Mandar parar algo que ninguém faz. O hábito precisa ser algo que o espectador reconheça em si.",
    match: "^\\s*(?:pare de|não faça|nunca|stop|quit|never|don'?t|dont|please)\\b[^.!?]{0,30}\\b(?:faça|poste|use|compre|comece|do|be|make|buy|use|start|say|post)?",
  },
  {
    id: 3,
    name: "Nobody Tells You",
    template: "Ninguém te conta que {verdade desconfortável}.",
    example: "Ninguém te conta que os seus primeiros 30 reels foram feitos para dar errado.",
    on_screen: "SEUS PRIMEIROS 30 VÃO FLOPAR",
    best_for: "Novos públicos. Posiciona você como a voz de autoridade sem rodeios.",
    trap: "Falar algo que todo mundo já diz. Se os comentários concordarem antes do fim, não era segredo.",
    match: "\\b(?:ninguém|ninguem|no one|nobody)\\s+(?:te conta|te diz|te ensina|tells|told|says|said)\\b|\\bo que (?:ninguém|nobody) (?:conta|diz|tells)\\b",
  },
  {
    id: 4,
    name: "The Replacement",
    template: "{Esta coisa} substituiu {coisa cara} por {fração do preço}.",
    example: "Esta ferramenta de R$ 60 substituiu a equipe de edição de R$ 3.000/mês.",
    on_screen: "R$ 3.000 -> R$ 60",
    best_for: "Demonstrações e comparações. O abismo de preço faz o trabalho de atração.",
    trap: "Exagerar na substituição. Se substitui 60%, diga 60%, senão os comentários rebatem.",
    match: "(?:substituiu|substitui|replaced?)[^.!?]*(?:\\$|r\\$)\\s?\\d|(?:\\$|r\\$)\\s?\\d[^.!?]*(?:substituiu|replaced?)|em vez de pagar",
  },
  {
    id: 5,
    name: "Time Collapse",
    template: "Isso costumava levar {tempo longo}. Agora leva {tempo curto}.",
    example: "Criar propostas levava 4 horas. Hoje leva 15 minutos.",
    on_screen: "4 HORAS -> 15 MIN",
    best_for: "Processos e tutoriais onde o ganho é velocidade e produtividade.",
    trap: "Prometer um ratio inacreditável (ex: 40 horas virar 2 segundos parece mentira).",
    match: "(?:costumava levar|levava|used to take)[^.!?]*(?:agora|hoje|now)|(?:agora|now) leva \\d+\\s*(?:seg|min|hora|hrs?)",
  },
  {
    id: 6,
    name: "The Receipt",
    template: "Eu {fiz isso} por {N dias}. Aqui estão os números reais.",
    example: "Postei 1 reel por dia durante 60 dias. Aqui está o que aconteceu com as minhas DMs.",
    on_screen: "60 DIAS. NÚMEROS REAIS.",
    best_for: "Experimentos. Conecta com a gravação de tela do painel analítico real.",
    trap: "Fazer claims de números sem mostrar a tela.",
    match: "(?:fiz|postei|testei|i posted|i ran)[^.!?]{0,30}(?:por|durante|for)\\s+\\d+\\s+(?:dias|semanas|meses|days)|aqui estão os números|here are the numbers",
  },
  {
    id: 7,
    name: "Wrong Way, Right Way",
    template: "Você está fazendo {coisa} errado, e a culpa não é sua. {A solução}.",
    example: "Você está escrevendo legendas errado, e a culpa não é sua. O Instagram corta tudo após a linha 1.",
    on_screen: "SUAS LEGENDAS SÃO CORTADAS",
    best_for: "Conteúdo educativo. A parte 'não é sua culpa' impede que soe ofensivo.",
    trap: "Esquecer de aliviar a culpa. 'Você está fazendo errado' sozinho faz as pessoas saírem do vídeo.",
    match: "(?:o maior erro|erro comum|fazendo errado|doing it wrong|doing this wrong|you're doing[^.!?]*wrong)",
  },
  {
    id: 8,
    name: "Insider Leak",
    template: "Passei {N anos} {dentro da indústria}. Aqui está o que nunca falamos em público.",
    example: "Passei 6 anos vendendo contratos de agência. Aqui está o que nunca colocamos na proposta.",
    on_screen: "6 ANOS DE BASTIDOR",
    best_for: "Autoridade direta sem precisar de slide de currículo.",
    trap: "Prometer um segredo e entregar o óbvio.",
    match: "(?:passei|trabalhei|vendi|i spent|i worked)[^.!?]*\\d+\\s*(?:\\+?\\s*anos|years)|o que nunca falamos|o que ninguém revela",
  },
  {
    id: 9,
    name: "The Steal",
    template: "Copie este {modelo/processo}. Levei {tempo} para acertar.",
    example: "Copie este script de 4 linhas. Levei 2 anos e dezenas de leads perdidos para validar.",
    on_screen: "COPIE ESTE MODELO",
    best_for: "Salvamentos e compartilhamentos diretos.",
    trap: "O artefato não estar na tela para poder tirar print.",
    match: "(?:copie este|roube este|steal this|salve este modelo|pegue este)",
  },
  {
    id: 10,
    name: "If This, Then Watch",
    template: "Se você {situação específica}, os próximos {segundos} resolvem isso.",
    example: "Se os seus reels têm visualizações mas zero seguidores, os próximos 40 segundos resolvem.",
    on_screen: "VIEWS SEM SEGUIDORES?",
    best_for: "Qualificação cirúrgica de público comprador.",
    trap: "Uma situação ampla demais que não qualifica ninguém.",
    match: "^\\s*(?:se você|se o seu|se sua|if you|if your)\\b",
  },
  {
    id: 11,
    name: "Numbered With A Favourite",
    template: "{N} {coisas} que {resultado}. O número {X} é o que quase ninguém usa.",
    example: "5 edições de legenda que dobram salvamentos. O número 4 é o que ninguém faz.",
    on_screen: "5 DICAS. A #4 É A MELHOR.",
    best_for: "Retenção pelo meio do vídeo até o item favorito.",
    trap: "Colocar mais de 7 itens.",
    match: "^\\s*(?:aqui estão\\s+)?\\d+\\s+\\w+|\\bnúmero \\d+\\b|\\bnumber \\d+\\b|\\b(?:três|quatro|cinco|sete|dez|three|four|five)\\s+\\w+",
  },
  {
    id: 12,
    name: "The Objection",
    template: "\"{Objeção real do cliente}\". Tudo bem. Aqui está a versão que funciona mesmo assim.",
    example: "\"Eu não quero aparecer na câmera\". Tudo bem. Aqui está a versão sem rosto que vende.",
    on_screen: "\"NÃO QUERO APARECER\"",
    best_for: "Vender para quem já deu uma desculpa para não comprar.",
    trap: "Inventar uma objeção falsa que nenhum cliente real diz.",
    match: "^\\s*[\"“''][^\"“”'']{5,120}[\"“”''][,.]?\\s*(?:tudo bem|ok|aqui está|fine|here)",
  },
  {
    id: 13,
    name: "Before And After, On Screen",
    template: "{Mostre o antes}. {Mostre o depois}. {Uma frase sobre a alavanca}.",
    example: "Este era o meu perfil em março. Este é ele agora. Mudei apenas o campo de nome.",
    on_screen: "MARÇO / AGORA",
    best_for: "Transformações visuais e comprovações imediatas.",
    trap: "Listar 3 ou mais mudanças ao mesmo tempo, diluindo a causa.",
    match: "(?:este era|olha como era|before)[^.!?]*[.!?]\\s*(?:este é|agora|after)|antes e depois",
  },
  {
    id: 14,
    name: "The Callout",
    template: "{Grupo específico}, esta é a estratégia que vocês estão ignorando.",
    example: "Fotógrafos cobrando menos de R$ 2.000: este é o erro de precificação que vocês cometem.",
    on_screen: "FOTÓGRAFOS ATENÇÃO",
    best_for: "Segmentação instantânea e marcação de amigos nos comentários.",
    trap: "Chamar um grupo genérico demais (ex: 'Empreendedores').",
    match: "^\\s*(?:para quem|atenção|você que é|every|all|any)\\s+\\w+|^\\s*[a-záéíóúâêôãõç][\\w ]{2,28}(?:ores|istas|eiros|ers)\\b\\s*[,:]",
  },
  {
    id: 15,
    name: "The Flop Record",
    template: "Meus primeiros {N} {tentativas} deram em nada. O que mudou na {N+1}.",
    example: "Meus primeiros 40 reels tiveram 200 views. O 41º passou de 300 mil. Uma coisa mudou.",
    on_screen: "40 FLOPS, DEPOIS ISSO",
    best_for: "Gerar empatia e identificação com quem está começando.",
    trap: "Dizer que foi apenas sorte em vez de um método.",
    match: "(?:meus primeiros|minhas primeiras|my first)\\s+\\d+|primeiros \\d+ (?:reels|vídeos|posts|clientes)",
  },
  {
    id: 16,
    name: "The Verbatim Question",
    template: "\"{Pergunta exata que te fizeram}\" - recebo isso toda semana.",
    example: "\"Como manter constância sem pirar?\" Recebo essa pergunta toda semana.",
    on_screen: "PERGUNTA FREQUENTE",
    best_for: "Indexação de busca do Instagram e quebra de dúvidas comuns.",
    trap: "Polir demais a pergunta; o valor está nas palavras exatas do público.",
    match: "^\\s*[\"“'']?(?:como|qual|por que|quando|onde|quem|posso|how|what|why)\\b[^?]{3,110}\\?",
  },
  {
    id: 17,
    name: "Head To Head",
    template: "{A} versus {B}. Testei ambos por {tempo} e o resultado não foi nem perto.",
    example: "Carrossel versus Reel. Testei ambos por 90 dias e o resultado foi chocante.",
    on_screen: "CARROSSEL vs REEL",
    best_for: "Geração de debate e comentários polarizados.",
    trap: "Ficar em cima do muro sem escolher um lado vencedor.",
    match: "(?:\\bvs\\.?|versus\\b|diferença entre|qual é melhor)",
  },
  {
    id: 18,
    name: "Cold Open Demo",
    template: "{Comece no meio da ação}. Veja o que acontece agora.",
    example: "Veja o que acontece quando eu coloco a legenda de um concorrente nesta IA.",
    on_screen: "VEJA ISSO",
    best_for: "Vídeos práticos de tela e demonstrações de ferramentas.",
    trap: "Demorar mais de 10 segundos para entregar o resultado da ação.",
    match: "^\\s*(?:veja o que|olha o que acontece|watch what|deixa eu te mostrar|olha isso)",
  },
  {
    id: 19,
    name: "The Deadline",
    template: "{Coisa} vai mudar em {data}. Faça {ação} antes disso.",
    example: "O alcance das hashtags mudou. Ajuste suas legendas para no máximo 5 antes de postar.",
    on_screen: "ANTES DE POSTAR",
    best_for: "Urgência real gerada por novidades de plataforma ou mercado.",
    trap: "Inventar urgência falsa.",
    match: "(?:antes de|vai mudar|atualização do instagram|before you|changes on)",
  },
  {
    id: 20,
    name: "Permission",
    template: "Você não precisa de {o que todo mundo diz que precisa}.",
    example: "Você não precisa de um nicho engessado. Você precisa de uma pessoa específica.",
    on_screen: "VOCÊ NÃO PRECISA DE NICHO",
    best_for: "Alívio emocional e alto índice de salvamentos.",
    trap: "Tirar a barreira sem colocar uma solução concreta no lugar.",
    match: "(?:você não precisa|voce nao precisa|não é necessário|you don'?t need)",
  },
  {
    id: 21,
    name: "Mid-Sentence Start",
    template: "{...e foi aí que {a reviravolta aconteceu}.}",
    example: "...e foi nesse momento que o cliente pediu o dinheiro de volta após aprovar o projeto.",
    on_screen: "PEDIU REEMBOLSO",
    best_for: "Storytelling com retenção máxima imediata.",
    trap: "Não explicar o contexto logo nos primeiros 8 segundos.",
    match: "^\\s*(?:\\.\\.\\.|…)|^\\s*(?:e foi aí|e aí quando|and that's when)",
  },
  {
    id: 22,
    name: "Contrarian Flip",
    template: "{Frase ou ditado comum invertido estrategicamente.}",
    example: "Quem chega cedo bebe água suja.",
    on_screen: "NÃO CHEGUE CEDO",
    best_for: "Comentários e quebra violenta de padrão mental.",
    trap: "Inverter uma frase que ninguém conhece.",
    match: "(?:ao contrário do que|o oposto|nice guys finish|o barato que sai)",
  },
  {
    id: 23,
    name: "The Statistic",
    template: "{N}% das pessoas no {nicho} {fato surpreendente}.",
    example: "82% dos criadores que desistem no Instagram pararam no 12º vídeo.",
    on_screen: "82% DESISTEM AQUI",
    best_for: "Compartilhamentos diretos (sends por direct).",
    trap: "Estatística inventada sem fonte confiável.",
    match: "^\\s*\\d[\\d,.]*\\s?%|\\b\\d[\\d,.]*\\s?%\\s+(?:dos|das|of)\\b",
  },
  {
    id: 24,
    name: "The Reveal",
    template: "Este é o novo {método/ferramenta}.",
    example: "Este é o novo microfone sem fio de R$ 90 que supera os de R$ 1.000.",
    on_screen: "O NOVO MÉTODO",
    best_for: "Apresentações visuais ou unboxings práticos.",
    trap: "Mostrar o objeto sem explicar a transformação que ele causa.",
    match: "^\\s*(?:este é o novo|esta é a nova|this is the new|conheça o novo)",
  },
  {
    id: 25,
    name: "Someone Else's Result",
    template: "Teve um {cliente/aluno} que {resultado} em {tempo}.",
    example: "Teve uma aluna que faturou R$ 38.000 com um único carrossel de 7 lâminas.",
    on_screen: "R$ 38K COM 1 POST",
    best_for: "Prova social de terceiros para quem ainda não tem dados pessoais.",
    trap: "Ocultar contexto ou parecer mentira forjada.",
    match: "(?:teve um|conheci um|um cliente nosso|one creator who|there was one)",
  },
  {
    id: 26,
    name: "The Superlative",
    template: "A {mais rápida / mais eficiente} forma de {resultado} é {resposta direta}.",
    example: "A forma mais rápida de destravar autoridade é construir provas irrefutáveis.",
    on_screen: "A FORMA MAIS RÁPIDA",
    best_for: "Afirmação direta de valor sem rodeios.",
    trap: "Entregar uma resposta genérica como 'consistência'.",
    match: "^\\s*(?:a forma mais|o jeito mais|a melhor forma|the fastest|the best|o maior erro)",
  },
];

export function classifyHookFormula(hookText: string): { formulaId: number | null; formulaName: string } {
  const clean = (hookText || "").trim();
  if (!clean) return { formulaId: null, formulaName: "Não classificado" };

  const byId = new Map(INSTAGRAM_HOOK_FORMULAS.map((h) => [h.id, h]));

  for (const id of HOOK_CLASSIFY_ORDER) {
    const formula = byId.get(id);
    if (!formula) continue;

    try {
      const regex = new RegExp(formula.match, "i");
      if (regex.test(clean)) {
        return { formulaId: formula.id, formulaName: formula.name };
      }
    } catch {
      // Ignora erro de regex individual
    }
  }

  return { formulaId: null, formulaName: "Fórmula Livre / Não classificada" };
}
