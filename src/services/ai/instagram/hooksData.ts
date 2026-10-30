export interface InstagramHookFormula {
  id: number;
  name: string;
  template: string;
  example: string;
  on_screen: string;
  best_for: string;
  trap: string;
  match?: string;
}

export const INSTAGRAM_HOOK_RULES = [
  "Escreva a fala dita no vídeo e a linha na tela separadamente. Na tela deve ser mais curta e direta, com 6 palavras ou menos.",
  "Sem enrolação nos primeiros 3 segundos. O vídeo começa onde normalmente começaria no segundo 6.",
  "Diga números específicos. 'Muito' ou 'bastante tempo' não são números.",
  "O primeiro frame é um gancho visual. Uma cabeça estática falando sem movimento nem texto perde 3 segundos de retenção.",
  "Se o gancho servir para qualquer concorrente do seu nicho, não é seu. Coloque a especificidade que só a sua marca tem.",
  "O gancho promete algo. Entregue o que prometeu antes da metade do vídeo ou a retenção despenca."
];

export const INSTAGRAM_HOOK_FORMULAS: InstagramHookFormula[] = [
  {
    id: 1,
    name: "Cost Confession (Confissão de Custo)",
    template: "{Valor específico} foi o que {um erro} me custou.",
    example: "R$ 18.000 foi o que uma cláusula ausente no contrato me custou.",
    on_screen: "ERRO DE R$ 18.000",
    best_for: "Construir confiança rápido. As pessoas assistem até o final quando você expõe um erro real seu.",
    trap: "Custo genérico ou emocional. 'Custou minha paz' não gera o mesmo impacto imediato que um número real."
  },
  {
    id: 2,
    name: "Negative Command (Comando Negativo)",
    template: "Pare de {ação comum que todos fazem}. Faça {alternativa inteligente} em vez disso.",
    example: "Pare de postar 3 vezes por dia. Poste 2 vezes e responda a todos os comentários por 1 hora.",
    on_screen: "PARE DE POSTAR TODO DIA",
    best_for: "Salvamentos e debates nos comentários. O comando imperativo atrai atenção imediata.",
    trap: "Mandar parar algo que ninguém faz. O hábito precisa ser algo que o espectador reconheça em si."
  },
  {
    id: 3,
    name: "Nobody Tells You (O que Ninguém Conta)",
    template: "Ninguém te conta que {verdade desconfortável sobre o que eles querem alcançar}.",
    example: "Ninguém te conta que os seus primeiros 30 reels foram feitos para dar errado.",
    on_screen: "SEUS PRIMEIROS 30 VÃO FLOPAR",
    best_for: "Novos públicos. Posiciona você como a voz de autoridade sem rodeios.",
    trap: "Falar algo que todo mundo já diz. Se os comentários concordarem antes do fim, não era segredo."
  },
  {
    id: 4,
    name: "The Replacement (A Substituição)",
    template: "{Esta ferramenta/método} substituiu {coisa cara} por {fração do valor}.",
    example: "Esta ferramenta de R$ 60 substituiu a equipe de edição de R$ 3.000/mês.",
    on_screen: "R$ 3.000 -> R$ 60",
    best_for: "Demonstrações práticas e comparações. O abismo de preço faz o trabalho de atração.",
    trap: "Exagerar na substituição. Se substitui 70%, diga 70%, senão os comentários vão rebater."
  },
  {
    id: 5,
    name: "Time Collapse (Colapso de Tempo)",
    template: "Isso costumava levar {tempo longo}. Agora leva {tempo curto}.",
    example: "Criar propostas levava 4 horas. Hoje leva 15 minutos.",
    on_screen: "4 HORAS -> 15 MIN",
    best_for: "Processos e tutoriais onde o ganho é velocidade e produtividade.",
    trap: "Prometer um ratio inacreditável (ex: 40 horas virar 2 segundos parece mentira)."
  },
  {
    id: 6,
    name: "The Counter-Intuitive Truth (A Verdade Contraintuitiva)",
    template: "O motivo de você não conseguir {resultado} é exatamente porque você está tentando {o que todos mandam fazer}.",
    example: "O motivo de você não vender na DM é porque você responde a mensagem rápido demais.",
    on_screen: "NÃO RESPONDA TÃO RÁPIDO",
    best_for: "Quebra de padrão e retenção alta no feed.",
    trap: "Não conseguir sustentar a tese com lógica sólida nos primeiros 10 segundos."
  },
  {
    id: 7,
    name: "The Single Sentence Test (O Teste de 1 Frase)",
    template: "Se você não consegue explicar {sua oferta/método} em uma frase, o problema não é o tráfego.",
    example: "Se você precisa de 10 minutos para explicar o que vende, o problema não é o algoritmo.",
    on_screen: "TESTE DE 1 FRASE",
    best_for: "Autoridade e qualificação de público qualificado.",
    trap: "Ser vago na solução apresentada em seguida."
  },
  {
    id: 8,
    name: "Behind Closed Doors (Bastidor Revelado)",
    template: "É isso que acontece nos bastidores quando {situação de alto impacto}.",
    example: "É isso que acontece numa agência de 7 dígitos quando um cliente cancela um contrato de 50k.",
    on_screen: "BASTIDOR DE 7 DÍGITOS",
    best_for: "Curiosidade humana e storytelling magnético.",
    trap: "Fazer um bait exagerado e entregar uma historinha sem conclusão prática."
  },
  {
    id: 9,
    name: "Specific Number Teardown (Desconstrução de Número)",
    template: "Como faturamos {R$ X} com apenas {Y seguidores/posts}.",
    example: "Como fechamos R$ 42.000 em vendas com apenas 840 seguidores.",
    on_screen: "R$ 42K COM 800 SEGUIDORES",
    best_for: "Destruir a crença de que precisa ser 'famoso' para faturar alto.",
    trap: "Números inflados ou sem transparência metodológica."
  },
  {
    id: 10,
    name: "The Unforgivable Mistake (O Erro Imperdoável)",
    template: "O maior erro que vejo {seu público-alvo} cometendo toda semana:",
    example: "O maior erro que vejo fundadores de SaaS cometendo antes de lançar:",
    on_screen: "ERRO QUE MATA SEU SAAS",
    best_for: "Identificação imediata de dores do ICP.",
    trap: "Citar um erro bobo e superficial."
  }
];

export function getHookFormulaById(id: number): InstagramHookFormula | undefined {
  return INSTAGRAM_HOOK_FORMULAS.find((f) => f.id === id);
}
