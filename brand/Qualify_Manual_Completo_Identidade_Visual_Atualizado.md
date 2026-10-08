# QUALIFY — Manual completo de identidade visual e design system

> **Versão:** 1.1 — inclui sistema expandido de variações da logo (seção 04.9)  
> **Idioma:** Português (Brasil)  
> **Escopo:** marca, interfaces SaaS, comunicação, aplicações e documentação de componentes  
> **Referência principal:** painel de oito seções fornecido pelo usuário, com a assinatura “Qualify” azul em fundo claro e branca sobre gradiente violeta–azul.

## Como interpretar este documento

Este material traduz a composição visual do painel em regras utilizáveis por designers, desenvolvedores e equipes de comunicação.

- **[PAINEL]** identifica um elemento ou valor legível e apresentado na referência visual.
- **[NORMA PROPOSTA]** identifica uma regra operacional detalhada criada para tornar a identidade reproduzível. Ela não é necessariamente uma especificação originalmente aprovada pela marca.
- **[VALIDAR]** identifica decisões que precisam ser confirmadas com arquivos vetoriais originais, auditoria de contraste, protótipo real ou proprietários da marca.

**Importante:** o painel é uma apresentação de conceito. Ele não substitui arquivos mestres da logo, telas de produção, fotografias licenciadas, medidas técnicas de impressão ou um conjunto de tokens já implementado. Os hexadecimais listados abaixo são transcritos do painel; antes da adoção final, devem ser validados a partir dos arquivos de identidade aprovados. Os mockups, textos e números ilustrados no painel são exemplos conceituais e não resultados reais de clientes.

---

# 00 — FUNDAMENTOS DA MARCA

## 00.1 Identificação

| Propriedade | Definição |
|---|---|
| Nome | **Qualify** |
| Categoria | Plataforma digital / ecossistema de tecnologia e operações |
| Assinatura principal | Wordmark “Qualify” |
| Tagline [PAINEL] | **Tecnologia, clareza e escala.** |
| Personalidade [PAINEL] | **Moderna · Confiável · Inteligente** |
| Linguagem | Tecnológica, objetiva, segura, acessível e orientada a resultados |
| Universo cromático | Azul, violeta, branco e neutros frios |
| Estilo visual | SaaS premium minimalista, modular, com gradientes e profundidade sutil |

## 00.2 Manifesto curto da marca

**[PAINEL — texto de referência]** A Qualify é apresentada como uma plataforma digital que simplifica processos, conecta pessoas e impulsiona resultados, combinando tecnologia e clareza para favorecer eficiência, controle e liberdade.

**[NORMA PROPOSTA — texto institucional revisado]**

> A Qualify transforma operações complexas em experiências simples, conectadas e inteligentes. Reunimos tecnologia, processos e informação em um ambiente claro e confiável, para que empresas tenham mais controle sobre suas rotinas e mais espaço para crescer.

## 00.3 Posicionamento e percepção desejada

A experiência da Qualify deve transmitir:

1. **Clareza antes do espetáculo:** a informação importante é percebida imediatamente.
2. **Confiança antes do exagero:** interfaces estáveis, estados explícitos e cores consistentes.
3. **Sofisticação funcional:** acabamento premium sem prejudicar a leitura ou a produtividade.
4. **Inteligência aplicada:** tecnologia que resolve rotinas reais, não apenas efeitos estéticos.
5. **Escalabilidade:** um sistema reutilizável que suporta módulos e públicos diferentes.

### O que a marca deve evitar

- Visual genérico de template sem características próprias.
- Excesso de gradientes, halos luminosos ou vidro fosco em telas densas.
- Texto muito pequeno, contraste fraco ou excesso de caixa-alta.
- Linguagem vaga como “revolucionário” sem prova ou contexto.
- Variações espontâneas de azul e roxo de uma tela para outra.
- Tratar todas as ações como se tivessem a mesma importância.

## 00.4 Direção de comunicação

| Dimensão | Diretriz [NORMA PROPOSTA] |
|---|---|
| Voz | Confiante, direta, colaborativa |
| Tom em marketing | Inspirador, concreto e objetivo |
| Tom no produto | Breve, instrutivo, sem ambiguidades |
| Tom em erro | Claro, respeitoso e orientado à solução |
| Verbos preferenciais | Conectar, acompanhar, organizar, automatizar, visualizar, crescer |
| CTA primário | Verbo que descreve a ação: **Criar campanha**, **Adicionar contato**, **Continuar** |
| Provas | Resultados verificáveis e métricas contextualizadas, não alegações genéricas |

---

# 01 — COLOR SYSTEM / SISTEMA DE CORES

## 01.1 Paleta primária [PAINEL]

| Token proposto | Nome apresentado | HEX | Papel sugerido |
|---|---|---|---|
| `brand.blue` | Azul principal | `#3B4DFF` | Cor institucional, botões primários e links de marca |
| `brand.violet` | Violeta | `#7C3AED` | Acento premium, gradientes e comunicação expressiva |
| `brand.white` | Branco | `#FFFFFF` | Superfícies claras e marca reversa |

**Princípio:** o azul é o eixo de identidade. O violeta complementa e dá expressividade, mas não deve competir com o azul em toda a interface.

## 01.2 Paleta secundária [PAINEL]

| Token proposto | Nome apresentado | HEX | Uso sugerido |
|---|---|---|---|
| `surface.blue-soft` | Azul claro | `#E8F0FF` | Fundos informativos, estados sutis e destaques suaves |
| `surface.cool-gray` | Cinza frio | `#F1F5F9` | Fundo geral, divisores e áreas secundárias |
| `border.cool-gray` | Cinza médio | `#CBD5E1` | Bordas, separadores e campos desativados, com validação de contraste |

## 01.3 Cores de destaque [PAINEL]

| Token proposto | Nome apresentado | HEX | Significado sugerido |
|---|---|---|---|
| `accent.cyan` | Ciano | `#06B6D4` | Integração, informação e conectividade |
| `accent.purple` | Roxo | `#8B5CF6` | Inteligência, automação e realce visual |
| `accent.green` | Verde | `#10B981` | Êxito, conclusão, conexão saudável |
| `accent.orange` | Laranja | `#F97316` | Atenção, informação que demanda ação |

**[NORMA PROPOSTA]** Não usar cor isoladamente para indicar estado. Sempre combinar com texto, ícone e, quando necessário, mensagem de apoio. A cor laranja do painel não define automaticamente todo o sistema de alertas; estados semânticos exigem teste de contraste.

## 01.4 Gradientes [PAINEL]

**Gradiente principal Qualify**

- Início: `#8B5CF6`
- Fim: `#3B4DFF`
- Aparência: transição violeta → azul.
- Aplicações: capa institucional, hero, fundos promocionais, banners e destaques pontuais.

**Gradiente suave**

- Início: `#E8F0FF`
- Fim: `#FFFFFF`
- Aparência: azul pálido → branco.
- Aplicações: superfícies de apresentação, fundos discretos, seções introdutórias.

**[NORMA PROPOSTA]** Valores de ângulo e direção precisam ser padronizados. Sugestão:

```css
:root {
  --qualify-blue: #3B4DFF;
  --qualify-violet: #7C3AED;
  --qualify-purple-accent: #8B5CF6;
  --qualify-white: #FFFFFF;
  --qualify-blue-soft: #E8F0FF;
  --qualify-gray-50: #F1F5F9;
  --qualify-gray-300: #CBD5E1;
  --qualify-cyan: #06B6D4;
  --qualify-green: #10B981;
  --qualify-orange: #F97316;

  --qualify-gradient-brand: linear-gradient(120deg, #8B5CF6 0%, #3B4DFF 100%);
  --qualify-gradient-soft: linear-gradient(120deg, #E8F0FF 0%, #FFFFFF 100%);
}
```

> **[VALIDAR]** A arte superior direita usa um gradiente mais profundo, com regiões azul-marinho. O painel não fornece o HEX exato dessas regiões. Não tratá-las como tokens oficiais sem amostragem do arquivo mestre.

## 01.5 Hierarquia cromática [NORMA PROPOSTA]

- **60–75%:** superfícies neutras / brancas.
- **15–30%:** texto, linhas, divisórias, neutros.
- **5–10%:** azul e violeta em ações, indicadores e destaques.

As proporções são direcionais, não quotas automáticas para cada tela. Um dashboard denso pode precisar de ainda menos cor decorativa.

## 01.6 Regras por contexto

| Contexto | Cor predominante | Observação |
|---|---|---|
| Produto em modo claro | Branco / cinzas frios | Máxima legibilidade |
| CTA primário | Azul principal | Uma ação predominante por região |
| Navegação selecionada | Azul com fundo suavizado | Estado identificável sem depender só da cor |
| Hero e landing | Gradiente da marca | Aplicar marca branca apenas sobre regiões contrastantes |
| Dashboard e tabelas | Neutros + azul de realce | Evitar gradiente em cada card |
| Sucesso e erro | Tokens semânticos dedicados | Validar contraste, textos e ícones |
| Ilustrações e campanhas | Azul + violeta + ciano | Mais liberdade, preservando reconhecimento |

## 01.7 Acessibilidade cromática [NORMA PROPOSTA]

- Para texto comum, mirar WCAG AA, normalmente razão mínima **4,5:1**.
- Para texto grande, razão mínima **3:1**.
- Para ícones e bordas relevantes de controles, usar como referência **3:1** com adjacências necessárias.
- Testar separadamente todos os trechos do gradiente atrás de textos brancos.
- Não presumir que uma cor bonita num swatch funcione como texto em fundo branco.
- Desativado não deve ser confundido com normal ou carregando; usar atributos e mensagens adequadas.

---

# 02 — TYPOGRAPHY SYSTEM / SISTEMA TIPOGRÁFICO

## 02.1 Tipografia apresentada [PAINEL]

- Família sugerida no painel: **Inter (ou similar)**.
- Amostra de personalidade: **“Aa”** grande, azul, de desenho contemporâneo.
- Pesos ilustrados: **Light, Regular, Medium, Semibold e Bold**.
- Hierarquia exibida: **H1 / Headline**, **H2 / Subtítulo**, **Body / Texto de apoio**.

**Exemplo H1:** “Construindo mais possibilidades”  
**Exemplo H2:** “Tecnologia para decisões mais inteligentes.”

## 02.2 Política tipográfica [NORMA PROPOSTA]

Usar **Inter** como família funcional para interface, corpo, tabelas, formulários e comunicação. A logo “Qualify” é um ativo gráfico, **não** deve ser reconstituída digitando o nome com Inter.

```css
:root { --font-ui: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; }
body { font-family: var(--font-ui); }
```

A fonte exata do lettering da logo não é identificável com segurança apenas pelo painel. Preservar o vetor aprovado.

## 02.3 Escala tipográfica sugerida

| Estilo | Desktop | Mobile | Peso | Line-height | Uso |
|---|---:|---:|---:|---:|---|
| `display` | 48 px | 36 px | 700 | 1.08–1.15 | Campanhas e grandes aberturas |
| `heading-1` | 32 px | 26 px | 700 | 1.2 | Título principal da página |
| `heading-2` | 24 px | 21 px | 650–700 | 1.25 | Seções principais |
| `heading-3` | 20 px | 18 px | 600 | 1.3 | Módulos e painéis |
| `heading-4` | 16 px | 16 px | 600 | 1.4 | Títulos de cards |
| `body` | 14–16 px | 14–16 px | 400 | 1.5 | Conteúdo geral |
| `body-small` | 13–14 px | 13–14 px | 400 | 1.45 | Tabelas compactas |
| `caption` | 12 px | 12 px | 400–500 | 1.45 | Ajuda e metadados |
| `label` | 13–14 px | 13–14 px | 500–600 | 1.35 | Campos, filtros e botões |

**Observações:**

- `650` é um alvo visual; se o arquivo de fonte não suportar o peso, usar `600` ou `700`.
- Evitar `10px` ou `11px` em informações operacionais importantes.
- Reservar caixa-alta para microtítulos ou marcações curtas; não para parágrafos.
- Usar números tabulares em KPIs comparáveis, se disponíveis: `font-variant-numeric: tabular-nums`.

## 02.4 Hierarquia e legibilidade

- Uma página deve ter um H1 semanticamente claro.
- H2 organiza a visão; H3 apresenta blocos relacionados.
- Rótulos devem explicar o significado de números e controles.
- Textos secundários devem manter contraste suficiente.
- Em telas estreitas, títulos devem quebrar sem sobrepor ações.
- Ajustar largura de parágrafo institucional para aproximadamente 45–75 caracteres por linha onde viável.

## 02.5 Microcopy

| Situação | Preferir | Evitar |
|---|---|---|
| Ação | “Criar automação” | “Executar” sem contexto |
| Confirmação | “Automação criada” | “Sucesso!” isolado |
| Erro | “Não foi possível carregar os contatos. Tente novamente.” | “Erro inesperado 500” como única resposta |
| Estado vazio | “Nenhum contato encontrado. Ajuste os filtros ou adicione um contato.” | “Sem dados” |
| Salvamento | “Alterações salvas” | Mensagem genérica sem identificar o resultado |

---

# 03 — VISUAL LANGUAGE / LINGUAGEM VISUAL

## 03.1 Fotografia e temas [PAINEL]

O painel ilustra **cinco categorias**:

| Categoria | Exemplo visual no painel | Mensagem |
|---|---|---|
| **Tecnologia** | Dispositivo / notebook com identidade Qualify | Inovação em cada detalhe |
| **Interface** | Dashboard em tela | Experiências intuitivas |
| **Produtividade** | Profissional em ambiente de trabalho | Mais foco, mais resultados |
| **Conexão** | Pessoas trabalhando juntas | Pessoas que constroem |
| **Operação** | Infraestrutura tecnológica / servidores | Escala com segurança |

## 03.2 Direção de arte [NORMA PROPOSTA]

**Composição**

- Priorizar enquadramentos limpos, focados em uma ação, pessoa ou interface.
- Incluir espaço negativo quando houver texto sobreposto.
- Usar fundos controlados, arquitetura contemporânea e tecnologia realista.
- Evitar ambientes excessivamente futuristas que pareçam desconectados de um SaaS operacional.

**Tratamento**

- Temperatura visual fria ou neutra, preservando tons de pele naturais.
- Azul e violeta em iluminação de apoio, overlays e peças de campanha.
- Contraste moderado, com boa definição do assunto principal.
- Texturas de ruído finas, nunca a ponto de prejudicar a leitura.

**Pessoas**

- Mostrar equipes e profissionais em situações de trabalho críveis.
- Priorizar variedade de pessoas, funções e contextos sem usar diversidade como mera decoração.
- Não atribuir depoimentos, nomes ou resultados a modelos fotográficos sem permissão.

**Interfaces fotografadas**

- Preferir capturas reais do produto para materiais informativos.
- Mockups de conceito podem ilustrar visão de marca, mas devem ser identificados como ilustrativos quando isso importar.
- Não exibir dados pessoais reais sem autorização.

## 03.3 Linguagem de ilustrações

- Formas geométricas modulares, círculos parciais, arcos, blocos arredondados.
- Linhas de conexão e pequenos nós representam integração e fluxo.
- Gradientes suaves, contornos finos e poucos elementos por cena.
- Evitar excesso de figuras 3D decorativas no produto transacional.

## 03.4 Enquadramento e sobreposições

**[NORMA PROPOSTA]**

- Hero: preferir composição horizontal com uma área segura para título.
- Social: garantir área de respiro para logo e mensagem.
- Cards de campanha: manter proporções repetíveis dentro do mesmo conjunto.
- Overlay sobre foto: aplicar uma superfície escura semitransparente quando necessária para contraste do texto.
- Evitar usar o wordmark sobre imagens visualmente agitadas sem base de contraste.

---

# 04 — BRAND APPLICATIONS / APLICAÇÕES DA MARCA

O painel mostra seis frentes: **embalagem, website, social media, aplicativo mobile, cartão de visita e outdoor**. São mockups conceituais.

## 04.1 Sistema de assinaturas da logo

### Versão A — logo institucional azul

- Wordmark azul em fundo branco ou muito claro.
- Uso preferencial: app claro, documentos, cartões brancos, cabeçalhos e assinaturas.

### Versão B — logo reversa branca

- Wordmark branco em fundo azul profundo ou gradiente violeta–azul.
- Uso preferencial: campanhas, banners, splash screens, capas e áreas de marca de alto contraste.

### Versão C — símbolo compacto [NORMA PROPOSTA / VALIDAR]

- Derivar o ícone da forma distintiva do **Q** do logotipo original.
- Usar apenas desenho vetorial aprovado; não recortar arbitrariamente caracteres do PNG.
- Reservar para favicon, avatar de aplicativo, sidebar recolhida e ícones de atalho.

### Área de proteção e tamanho mínimo [NORMA PROPOSTA / VALIDAR]

- Definir unidade `x` a partir de uma medida do vetor oficial (por exemplo, altura do traço interno do Q).
- Área livre preliminar: **mínimo 1x** ao redor da assinatura.
- Proibir achatamento, distorção, rotação, sombras pesadas e redesenho de letras.
- Os tamanhos mínimos impressos ou digitais **não podem ser fixados com precisão a partir do painel**; testar leitura em 24, 32, 48 e 120 px e definir padrões por variante.

## 04.2 Website

### Estrutura exemplificada no painel

- Header com logo Qualify à esquerda.
- Navegação resumida de produto, soluções e preços.
- CTA para começar.
- Headline ampla: **“Da estratégia aos resultados”**.
- Interface do SaaS em destaque como prova visual de produto.
- Botões de ação e um segundo CTA menos destacado.

### Diretrizes de execução

1. A primeira dobra deve responder o que é o produto, para quem serve e qual próximo passo.
2. CTA principal sólido azul; CTA secundário com contorno ou tratamento suave.
3. Gradiente pode aparecer no hero ou em faixa, mas conteúdo central deve permanecer legível.
4. Capturas do produto devem ser reais ou identificadas como conceito.
5. Provas, métricas e depoimentos exigem fonte verificável.
6. Desktop e mobile precisam de composições próprias, não apenas redução de escala.

## 04.3 Aplicativo mobile

### Elementos observáveis

- Logo no cabeçalho.
- Saudação / headline de valor.
- Card de métrica com números e tendência.
- Gráfico simplificado.
- Navegação inferior com ícones.

### Regras propostas

- Priorizar a tarefa principal do usuário em cada tela.
- Alvos interativos de pelo menos 44 × 44 px quando possível.
- Usar KPIs acompanhados de período, unidade e contexto.
- A cor verde para crescimento não substitui “+12%” ou equivalente.
- Evitar expor dashboards complexos exatamente como no desktop.
- Respeitar áreas seguras do dispositivo, teclado e acessibilidade.

## 04.4 Social media

### Linguagem proposta

- Versão branca da marca em gradiente quando houver contraste.
- Título principal curto; subtítulo opcional; um único foco por peça.
- Arquitetura urbana, tecnologia, interface e formas geométricas como linguagem auxiliar.
- CTA discreto e contextual; não competir com a assinatura.

### Formatos recomendados para templates [NORMA PROPOSTA]

| Peça | Dimensão-base |
|---|---|
| Post quadrado | 1080 × 1080 px |
| Post vertical | 1080 × 1350 px |
| Story / Reels | 1080 × 1920 px |
| Thumb horizontal | 1920 × 1080 px |

São dimensões operacionais sugeridas, não extraídas do painel nem garantia de área segura para todas as plataformas.

## 04.5 Embalagem

O painel usa uma caixa premium azul com nome Qualify, tagline curta e gráficos fluidos. Para um software, essa é uma aplicação **institucional/conceitual**, adequada para kits de boas-vindas, eventos e brindes, não evidência de um produto físico existente.

**Regras propostas:** acabamento fosco, detalhes de gradiente restritos, contraste alto e tipografia limpa. Em impressão, converter cores conforme perfil do fornecedor; **não converter HEX em CMYK por regra universal**.

## 04.6 Cartão de visita

O painel apresenta um cartão violeta/azul com marca branca e um cartão branco com marca azul, nome e contato.

**Especificação proposta:** nome em destaque, função, e-mail, contato profissional e QR code somente se tiver destino estável. O layout deve possuir sangria e margens definidas na arte final pela gráfica. Os nomes e contatos do mockup são ilustrativos.

## 04.7 Outdoor / billboard

- Gradiente e logo branca em tamanho dominante.
- Mensagem de poucas palavras.
- Contraste máximo e poucos elementos.
- Composição deve funcionar à distância e em leitura de poucos segundos.
- Evitar QR code ou detalhes de interface pequenos em peças destinadas a trânsito rápido.

## 04.8 Aplicações digitais adicionais [NORMA PROPOSTA]

- **Favicon:** Q vetorial aprovado, exportações 16, 32 e 48 px e `favicon.ico`.
- **Ícone web/PWA:** versões 192 e 512 px; considerar variante `maskable`.
- **Apple touch icon:** ícone quadrado otimizado, usualmente 180 px.
- **Open Graph:** arte de compartilhamento horizontal com logo e mensagem legíveis.
- **Assinatura de e-mail:** versão azul em fundo branco com informações essenciais.
- **PDFs e propostas:** capa com marca e gradiente; páginas internas neutras.
- **Splash screen:** fundo em gradiente com wordmark branco e, se adotado, símbolo compacto.
- **Modo escuro:** versão oficial branca ou equivalente contrastante; não inverter a logo azul por filtro CSS sem validação.

---


## 04.9 Sistema expandido de versões da logo [PAINEL DE VARIAÇÕES + NORMA PROPOSTA]

> **Referência:** prancha visual complementar de 11 áreas criada a partir da assinatura Qualify. As composições dessa prancha são **mockups e propostas gráficas**, não substituem vetores oficiais de produção. O wordmark mestre fornecido nas imagens originais deve ser a única fonte para redesenhar/exportar as variantes. Em particular, a geometria do “Q”, o espaçamento entre letras e o desenho do “fy” não devem ser aproximados por digitação em fontes comuns.

### 04.9.1 Princípio da família de assinaturas

A Qualify passa a ter uma **família controlada de assinaturas** com hierarquia explícita:

1. **Assinatura primária:** wordmark completo, azul, sem complemento. Padrão para fundos claros.
2. **Assinatura reversa:** mesmo wordmark completo, branco, sobre fundo escuro ou gradiente aprovado.
3. **Assinatura com símbolo à esquerda:** “Q” derivado do vetor + separador opcional + wordmark; indicada para espaços horizontais largos quando a aplicação justificar o símbolo adicional.
4. **Símbolo independente:** “Q” exclusivo da marca, para ícones e aplicações em que o nome não cabe.
5. **Assinatura vertical:** símbolo “Q” acima do wordmark, para formatos mais quadrados.
6. **Monocromáticas:** versões integralmente preta, branca ou cinza neutro quando a reprodução colorida não for possível.
7. **Versão outline / contorno:** experimental, uso restrito à direção de arte; **não** é assinatura oficial principal e requer aprovação.
8. **Versão especial com fundo gráfico:** arte de campanha que usa a logo oficial sem alterar seu desenho.
9. **Ícone com aparência tridimensional:** tratamento promocional opcional; não substitui favicon ou app icon padrão.

**Regra editorial:** a composição azul em superfície clara e a branca em fundo escuro são as duas escolhas padrão. As demais variantes são alternativas contextuais, não opções intercambiáveis por preferência estética.

### 04.9.2 Catálogo de versões e locais de uso

| Código | Variante | Assinatura / cor | Fundo autorizado | Aplicações preferenciais | Status |
|---|---|---|---|---|---|
| `QLF-01` | Principal | Wordmark azul | Branco, cinza frio e azul muito claro | Site, app, documentos e apresentações claras | Baseado na logo fornecida |
| `QLF-02` | Reversa | Wordmark branco | Azul escuro, navy e gradiente contrastante | Campanhas, telas de entrada e apresentações escuras | Baseado na logo fornecida |
| `QLF-03` | Horizontal com símbolo | Q + separador opcional + wordmark azul | Claro | Assinatura de cabeçalhos largos e documentos | Proposta; validar vetor e espaçamentos |
| `QLF-04` | Horizontal reversa | Q + separador opcional + wordmark branco | Escuro | Peças institucionais | Proposta |
| `QLF-05` | Q azul isolado | Q azul | Claro | Sidebar recolhida, ícones de navegação e marca d'água | Proposta derivada da letra Q |
| `QLF-06` | Q branco em gradiente | Q branco | Gradiente institucional | App icon, PWA, avatar e splash | Proposta |
| `QLF-07` | Q branco em navy | Q branco | Navy | Interfaces escuras e apresentações | Proposta |
| `QLF-08` | Q preto | Q preto | Branco ou claro | Documentos monocromáticos | Proposta |
| `QLF-09` | Wordmark preto | Wordmark preto | Branco ou claro | Impressão monocromática, fax, documentos legais | Proposta |
| `QLF-10` | Wordmark cinza | Wordmark cinza neutro | Claro, contraste aferido | Materiais secundários, nunca CTA principal | Proposta |
| `QLF-11` | Wordmark outline | Contorno da assinatura | Fundos simples | Peças gráficas experimentais | Restrita / aprovação obrigatória |
| `QLF-12` | Assinatura vertical azul | Q sobre wordmark azul | Claro | Composição quadrada e materiais editoriais | Proposta |
| `QLF-13` | Assinatura vertical branca | Q sobre wordmark branco | Escuro | Totens, cards e layouts compactos | Proposta |
| `QLF-14` | Logo sobre imagem | Wordmark branco ou azul, conforme contraste | Foto com área de respiro e overlay | Banners e campanhas | Proposta com teste de contraste |
| `QLF-15` | Logo sobre padrão geométrico | Wordmark intacto | Fundo gráfico controlado | Identidade institucional | Proposta |
| `QLF-16` | Ícone 3D | Relevo/volume do Q | Composição promocional | Motion, campanha e mockups | Experimental; nunca mestre |

### 04.9.3 Geometria e fidelidade [VALIDAR]

- Preservar **contorno externo, contraformas, diagonal do Q, desenho das letras e proporção largura/altura** do arquivo mestre.
- Não refazer o logo a partir da fonte Inter, mesmo que a tipografia da interface use Inter.
- Manter kerning, alinhamento ótico, espessura de traço e terminações do wordmark originais.
- O símbolo Q deve ser **extraído ou reconstruído fielmente do vetor aprovado**; não usar um “Q” Unicode ou a letra de outra família tipográfica.
- Separador vertical em `QLF-03/04` é opcional e apenas gráfico. Espessura, altura e distância dependem de especificação final.
- Não misturar letra Q de um arquivo com wordmark de outro arquivo que tenha desenho incompatível.
- Conferir nitidez em tamanhos pequenos e ajustar apenas a exportação/hinting, sem descaracterizar a geometria.

### 04.9.4 Área de proteção e proporção [NORMA PROPOSTA]

- Definir `x` como uma unidade construtiva mensurável do arquivo vetorial mestre, aprovada pelo responsável pela marca.
- Reservar em todas as direções ao menos **1×** ao redor do wordmark ou símbolo; confirmar a medida exata no vetor antes de oficializar.
- Elementos decorativos, bordas de cards, fotos, textos e ícones não podem entrar na área de proteção.
- Escalar a logo **proporcionalmente**, sem alteração independente de largura ou altura.
- Alinhar pelo **bounding box ótico** quando o prolongamento da letra “y” fizer a assinatura parecer descentralizada.
- Em aplicações mobile, respeitar simultaneamente safe area do dispositivo e área de proteção da marca.

### 04.9.5 Tamanhos mínimos e critérios de teste [NORMA PROPOSTA]

Os limites seguintes são **pontos de partida para teste**, não medidas comprovadas do logo original:

| Uso | Tamanho inicial para validar | Verificação |
|---|---|---|
| Wordmark em header desktop | 120–160 px de largura | Nome legível e contraste AA onde aplicável |
| Wordmark em cabeçalho mobile | 96–128 px de largura | Sem truncamento ou invasão de ações |
| Wordmark em assinatura de e-mail | 120 px de largura | Leitura em clientes de e-mail |
| Assinatura vertical | 96 px de largura | Respiro entre Q e nome |
| Q isolado em interface | 24 ou 32 px | Contraforma interna reconhecível |
| Avatar / ícone de app | 128, 192 e 512 px | Leitura em miniatura e recortes de plataforma |
| Favicon | 16 e 32 px | Reconhecimento em abas reais |
| Aplicação impressa | Definir após prova física | Reprodução de traços e mínimos gráficos |

**Critério de aprovação:** avaliar versões lado a lado em tamanho nativo de uso e sobre fundos reais. Se o Q perder leitura a 16 px, criar uma **variação óptica de favicon**, derivada fielmente do símbolo e formalmente aprovada, em vez de comprimir o wordmark completo.

### 04.9.6 Sistema de cores da logo

| Cenário | Aplicação | Não utilizar |
|---|---|---|
| Fundo branco `#FFFFFF` | Wordmark azul | Wordmark branco sem contorno funcional |
| Fundo cinza/azul claro | Wordmark azul, após checagem | Cinza claro com baixo contraste |
| Fundo azul institucional | Wordmark branco | Azul sobre azul parecido |
| Fundo gradiente violeta–azul | Wordmark branco | Wordmark multicolorido com pouco contraste |
| Fundo navy | Wordmark branco | Preto sem contraste |
| Foto ou vídeo | Versão com contraste comprovado + overlay quando necessário | Fundo visualmente poluído sem separação |
| Impressão uma cor | Preto ou branco monocromático | Gradiente convertido arbitrariamente em cinza |

**Importante:** cores do painel, como `#3B4DFF` e `#7C3AED`, são referências do manual conceitual; **confirmar os valores mestres no SVG oficial** antes de bloquear um token de produção. O mesmo vale para os pontos exatos do gradiente.

### 04.9.7 Ícones e favicons [NORMA PROPOSTA]

**Versões previstas:**

- `favicon.ico`: múltiplas resoluções para compatibilidade de navegadores.
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`.
- `apple-touch-icon.png`: 180×180 px, com margem óptica apropriada.
- `icon-192.png` e `icon-512.png`: aplicativos web/PWA.
- `icon-maskable-512.png`: desenho com área segura para recorte adaptativo.
- `qualify-icon.svg`: Q vetorial, sem fundos rasterizados.
- `qualify-icon-light.svg` e `qualify-icon-dark.svg`, quando houver contraste adequado.
- `og-qualify.png`: composição horizontal para compartilhamento, preferencialmente 1200×630 px.

**Regra:** o tamanho de arquivo não obriga o Q a tocar as bordas. Deixar margens ópticas, sobretudo nos ícones que são exibidos em máscaras circulares ou arredondadas. Testar no Chrome, Edge, Safari, Android e iOS onde aplicável.

Exemplo de integração web (nomes são convenção proposta; exigem arquivos reais):

```html
<link rel="icon" href="/brand/qualify/favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/brand/qualify/qualify-icon.svg" />
<link rel="apple-touch-icon" href="/brand/qualify/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

### 04.9.8 Usos proibidos

1. **Não deformar:** proibir alongar, estreitar, inclinar ou achatar.
2. **Não recolorir livremente:** rosa, verde, laranja ou outras cores não aprovadas não substituem a cor da marca.
3. **Não aplicar sombras ou glow arbitrários** à assinatura principal.
4. **Não adicionar contornos** ao wordmark oficial para compensar contraste ruim.
5. **Não rotacionar** para encaixar em layouts.
6. **Não inserir a logo diretamente sobre fundos poluídos** sem área limpa ou suporte de contraste.
7. **Não remontar letras**, trocar fonte, remover partes ou redesenhar o Q.
8. **Não aplicar gradiente dentro das letras** sem uma variante especificamente aprovada.
9. **Não usar versões rasterizadas pequenas ampliadas** em banners ou materiais impressos.
10. **Não tratar mockup 3D ou outline como logo mestre.**

### 04.9.9 Aplicações em superfícies e canais

**Ambiente digital:** navbar, sidebar, rodapé institucional, login, splash, avatar, carregamento, e-mail transacional, documentação e páginas públicas. Em telas operacionais, usar a assinatura com menor ruído visual que preserve reconhecimento.

**Ambiente físico:** cartões, papelaria, placas e fachadas. Na impressão, definir acabamento, materiais, margens, cores especiais e provas de produção. Renderizações de fachada na prancha não autorizam inferir medidas ou técnicas de fabricação.

**Campanhas:** composição do wordmark branco sobre gradiente, malhas geométricas ou fotos com contraste controlado. O fundo é variável; a assinatura não.

**Mobile / PWA:** ícone com Q em fundo gradiente ou sólido aprovado; prever versões quadradas, maskable e monocromáticas conforme o sistema operacional exigir.

### 04.9.10 Estrutura de assets, nomes e entregáveis [NORMA PROPOSTA]

```text
public/brand/qualify/
├── master/
│   ├── qualify-wordmark-master.svg
│   └── qualify-symbol-master.svg
├── wordmark/
│   ├── qualify-wordmark-blue.svg
│   ├── qualify-wordmark-white.svg
│   ├── qualify-wordmark-black.svg
│   └── qualify-wordmark-gray.svg
├── signatures/
│   ├── qualify-horizontal-blue.svg
│   ├── qualify-horizontal-white.svg
│   ├── qualify-vertical-blue.svg
│   └── qualify-vertical-white.svg
├── icons/
│   ├── qualify-icon-blue.svg
│   ├── qualify-icon-white.svg
│   ├── qualify-app-icon-512.png
│   ├── qualify-app-icon-maskable-512.png
│   └── apple-touch-icon.png
├── favicons/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   └── favicon-48x48.png
└── social/
    └── og-qualify.png
```

**Formatos recomendados:** `SVG` para interfaces e vetores mestres; `PNG` com transparência quando necessário para sistemas que não suportem SVG; `PDF` vetorial para gráficas; `ICO` para compatibilidade de favicon. `JPG` é adequado apenas para composições com fundo e não para a assinatura transparente. **A prancha visual criada não corresponde à entrega destes arquivos individuais**; é uma referência para seu desenvolvimento.

### 04.9.11 Política de aprovação e checklist

Antes de classificar qualquer variante como oficial, confirmar:

- [ ] O arquivo deriva do vetor mestre aprovado, sem reconstrução livre.
- [ ] O Q e as demais letras preservam proporções e espaçamento ótico.
- [ ] Cor do arquivo foi conferida contra os tokens de marca validados.
- [ ] A versão é legível no menor tamanho em que será usada.
- [ ] Não há invasão da área de proteção.
- [ ] Contraste foi aferido no fundo real de aplicação.
- [ ] Há versões compatíveis com light/dark sem recoloração improvisada.
- [ ] O favicon foi testado em 16 e 32 px.
- [ ] Ícones maskable mantêm o Q dentro da área segura.
- [ ] SVG não incorpora imagens raster desnecessárias nem scripts.
- [ ] Exportações PNG estão nítidas e usam transparência apropriada.
- [ ] Arquivos possuem nomenclatura versionada e fonte de verdade definida.
- [ ] Mockups/efeitos especiais não são usados como arquivos oficiais.

**Governança:** registrar autor, data, versão, contexto de uso, aprovação e localização do arquivo mestre. Qualquer variante que altere cor, forma, proporção ou composição deve passar por revisão de marca e de acessibilidade.

---

# 05 — LAYOUT SYSTEM / SISTEMA DE LAYOUT

## 05.1 Grid [PAINEL]

O painel exemplifica:

- **12 colunas**;
- **margem de 80 px**;
- **gutter de 24 px**.

Esses valores são ilustrados como exemplo de grid em uma composição desktop; **não devem ser impostos literalmente em telas menores**.

## 05.2 Grid responsivo [NORMA PROPOSTA]

| Largura de tela | Colunas | Margem horizontal sugerida | Gutter |
|---|---:|---:|---:|
| Mobile estreito | 4 | 16 px | 12–16 px |
| Mobile largo | 4 | 20 px | 16 px |
| Tablet | 8 | 24–32 px | 20–24 px |
| Desktop | 12 | 32–64 px | 24 px |
| Desktop amplo / landing | 12 | Container centrado | 24–32 px |

O limite de largura do conteúdo deve variar por tarefa: landing page pode usar container limitado; tabela operacional pode aproveitar mais largura.

## 05.3 Escala de espaçamento [PAINEL]

**4 · 8 · 16 · 24 · 32 · 48 · 64 px**.

**[NORMA PROPOSTA]** Acrescentar `12px` para situações compactas sem comprometer a escala principal.

| Token | Valor | Exemplos |
|---|---:|---|
| `space-1` | 4 px | Ícone e indicador compacto |
| `space-2` | 8 px | Separação ícone/texto |
| `space-3` | 12 px | Ações e campos compactos |
| `space-4` | 16 px | Padding de componentes |
| `space-6` | 24 px | Cards e seções |
| `space-8` | 32 px | Blocos importantes |
| `space-12` | 48 px | Separação entre seções |
| `space-16` | 64 px | Respiradores em landing pages |

## 05.4 Botões [PAINEL + NORMA PROPOSTA]

O painel demonstra três variantes: **Primário**, **Secundário**, **Ghost**.

| Variante | Aparência | Finalidade |
|---|---|---|
| Primário | Fundo azul, texto branco | Ação central da seção |
| Secundário | Fundo claro, borda azul e texto azul | Alternativa relevante |
| Ghost | Fundo neutro leve ou transparente | Ação terciária/contextual |
| Destrutivo [proposto] | Vermelho semântico | Excluir, revogar, apagar |
| Link [proposto] | Texto acionável | Navegação textual |

### Estados obrigatórios

- Default
- Hover
- Focus-visible
- Active / pressed
- Disabled
- Loading
- Success ou feedback posterior à ação, quando aplicável

### Dimensões propostas

- Botão normal: altura aproximada 40–44 px.
- Botão compacto: 32–36 px quando houver densidade operacional.
- Botão de toque: área interativa preferencial de 44 × 44 px.
- Raio: 8–10 px para o controle padrão; pills apenas para casos específicos.
- Ícone à esquerda ou direita com espaçamento previsível.
- Spinner durante carga sem mudança brusca de largura.

## 05.5 Cards e módulos

O painel mostra exemplos de **Crescimento** e **Automação**, com ícone, título e descrição em superfícies neutras.

### Anatomy de card [NORMA PROPOSTA]

1. Container com superfície, borda e raio.
2. Ícone ou elemento de identificação (se necessário).
3. Título.
4. Informação principal.
5. Descrição / apoio.
6. Ação ou link quando fizer sentido.
7. Estado interativo claro quando o card for clicável.

### Variantes

| Tipo | Característica |
|---|---|
| Informativo | Leitura; sem hover que simule clique |
| Interativo | Hover, foco, cursor e ação consistentes |
| Métrica | Número, unidade, período e contexto |
| Selecionável | Borda/fundo/indicador + `aria-selected` ou equivalente |
| Crítico | Feedback semântico, sem perder contraste |
| Vazio | Explica falta de dados e próxima ação |

**Uso moderado de efeitos:** cards transacionais ficam mais claros com superfícies sólidas. Glassmorphism e glow devem ficar em comunicações, showcases e pontos de destaque.

## 05.6 Tabelas e listas operacionais [NORMA PROPOSTA]

Embora o painel não detalhe tabelas, elas são essenciais para traduzir a linguagem do Qualify em SaaS.

- Cabeçalho com rótulos claros, alinhamento por tipo de dado e ordenação identificável.
- Células numéricas alinhadas à direita quando a leitura comparativa exigir.
- Larguras e quebras previsíveis, com truncamento que preserve acesso ao valor completo.
- Seleção de linhas com checkbox acessível e estados selecionados.
- Loading, vazio, erro, filtros sem resultado e paginação padronizados.
- Ações por linha sem botões de ícone ambíguos.
- Em mobile, priorização de colunas ou conversão a cards conforme tarefa.
- Status exibido por badge com rótulo e não apenas bolinha colorida.

## 05.7 Formulários [NORMA PROPOSTA]

**Anatomia:** label explícita, input, ajuda opcional, validação, erro específico e orientação de correção.

- Labels sempre associados aos campos.
- Obrigatoriedade indicada de forma coerente.
- Placeholders não substituem labels.
- Erros ficam próximos do campo e são anunciáveis para leitores de tela.
- Campos desabilitados explicam a condição quando necessário.
- Selects, dates, upload, switches e checkboxes usam tokens consistentes.
- Botões de confirmação respeitam a ordem de leitura e o risco da ação.

## 05.8 Navegação e arquitetura [NORMA PROPOSTA]

- Logo em local estável, com retorno previsível ao início.
- Sidebar e menus com agrupamentos claros e seleção persistente.
- Breadcrumbs em fluxos profundos, quando úteis.
- Busca e filtros associados ao conteúdo correspondente.
- Modal para decisões curtas; drawer para detalhes contextuais; tela completa para fluxos complexos.
- Em mobile, evitar reproduzir a sidebar inteira sem priorização.

## 05.9 Templates de telas

1. **Dashboard:** título, contexto temporal, KPIs, gráfico, insights e próximos passos.
2. **Listagem:** título, busca, filtros, ação principal, tabela/lista, paginação.
3. **Detalhe:** cabeçalho com entidade, status, abas e ações relevantes.
4. **Configurações:** navegação de categorias, campos agrupados e ação de salvar.
5. **Criação em etapas:** indicador de progresso, validação por passo e navegação segura.
6. **Estado vazio:** explicação breve, ilustração opcional e CTA contextual.
7. **Erro:** descrição, ação de recuperação e suporte/contexto técnico, se pertinente.
8. **Autenticação:** logo oficial, contexto mínimo, formulário central e recuperação de acesso.

---

# 06 — ICONOGRAPHY / ICONOGRAFIA

## 06.1 Conjunto exibido [PAINEL]

O painel traz doze temas:

1. Dashboard
2. Analytics
3. Usuários
4. Chat
5. Automação
6. Crescimento
7. Documentos
8. Segurança
9. Configurações
10. Workflow
11. IA / Insights
12. Mobile

**Características observáveis:** estilo linear predominantemente azul, aparência geométrica, cantos suaves e apresentação em pequenos containers claros arredondados.

## 06.2 Especificação técnica [NORMA PROPOSTA]

- Selecionar uma única biblioteca de ícones ou conjunto proprietários homogêneos.
- Tamanho normal: 20 px; compacto: 16 px; destaque: 24 px.
- Stroke recomendado: 1,75–2 px, ajustado conforme a biblioteca escolhida.
- Grid de desenho padronizada (por exemplo, viewBox 24 × 24).
- Alinhamento óptico e espaçamento iguais entre ícone e texto.
- Ícones sem rótulo visível precisam de nome acessível.
- Preferir SVG; evitar emoji como substituto inconsistente em UI.

## 06.3 Mapa funcional sugerido

| Conceito | Padrão semântico do ícone |
|---|---|
| Painel | grade / layout |
| Analytics | barras / tendência |
| Usuários | grupo de pessoas |
| Chat | balão de conversa |
| Automação | engrenagem / fluxo |
| Crescimento | seta ou curva ascendente |
| Documentos | folha com linhas |
| Segurança | escudo |
| Configurações | engrenagem |
| Workflow | nós conectados |
| IA / Insights | brilho / raio com semântica clara |
| Mobile | smartphone |

## 06.4 Cores e estados

- Padrão: texto/ícone neutro para navegação não selecionada.
- Ativo: azul principal sobre destaque suave.
- Decorativo: pode usar violeta ou degradê em peças institucionais.
- Status: ícone acompanha texto, não substitui mensagem.
- Hover e disabled: diferenciar por fundo, opacidade controlada e atributo funcional.

---

# 07 — PATTERNS & ELEMENTS / PADRÕES E ELEMENTOS

## 07.1 Elementos exibidos [PAINEL]

1. **Gradiente principal:** violeta → azul.
2. **Gradiente suave:** azul pálido → branco.
3. **Textura de ruído:** grão fino e delicado.
4. **Padrão geométrico:** grid, módulos e curvas suaves.
5. **Formas modulares:** arcos e blocos arredondados sobrepostos.
6. **Linhas de conexão:** traçados com pequenos nós.

## 07.2 Significado de cada padrão [NORMA PROPOSTA]

| Elemento | Ideia transmitida | Uso preferencial |
|---|---|---|
| Gradiente principal | Energia, inovação, transformação | Hero e capas |
| Gradiente suave | Simplicidade e acolhimento | Fundos claros e onboarding |
| Ruído fino | Materialidade e profundidade | Campanhas e fundos amplos |
| Grid geométrico | Estrutura e organização | Apresentações e seções de produto |
| Formas modulares | Flexibilidade e plataforma | Banners e materiais de marca |
| Linhas e nós | Conexão entre dados/processos | Automações e ilustrações técnicas |

## 07.3 Regras de composição

- Não aplicar todos os padrões ao mesmo tempo.
- Uma peça deve ter uma textura dominante e, no máximo, um segundo elemento de apoio.
- O padrão não pode atravessar textos com contraste insuficiente.
- Usar formas amplas nas campanhas; manter o produto mais silencioso.
- Em grids, preferir baixa opacidade e traços regulares.
- Reduzir ruído para evitar artefatos em compressão e pequenas telas.
- Linhas de conexão devem representar fluxo real quando usadas dentro do produto.

## 07.4 Biblioteca de assets sugerida

```text
brand/
├── logos/
│   ├── qualify-wordmark-blue.svg
│   ├── qualify-wordmark-white.svg
│   ├── qualify-symbol-blue.svg
│   └── qualify-symbol-white.svg
├── gradients/
│   ├── qualify-gradient-brand.svg
│   └── qualify-gradient-soft.svg
├── patterns/
│   ├── qualify-grid.svg
│   ├── qualify-modules.svg
│   ├── qualify-connections.svg
│   └── qualify-noise.png
├── social/
├── mockups/
└── icons/
```

**[VALIDAR]** Esses são nomes e arquivos *sugeridos* para organizar uma biblioteca; não indicam que os assets já foram gerados ou existem no projeto.

---

# 08 — MICRO DETAILS / MICRODETALHES

## 08.1 Amostras visuais [PAINEL]

- **Sombra suave:** quadrado claro elevado de forma discreta.
- **Blur / Glass:** superfície translúcida e fosca.
- **Glow da marca:** halo azul/violeta ao redor de elemento.
- **Superfície:** ruído/textura branca quase imperceptível.
- **Elevação:** camadas sobrepostas com sombra e separação.
- **Detalhe de interface:** toggle azul em estado ativo.

## 08.2 Sistema de sombras [NORMA PROPOSTA]

```css
:root {
  --shadow-xs: 0 1px 2px rgb(15 23 42 / 0.05);
  --shadow-sm: 0 2px 8px rgb(15 23 42 / 0.06);
  --shadow-md: 0 8px 24px rgb(15 23 42 / 0.10);
  --shadow-lg: 0 16px 48px rgb(15 23 42 / 0.14);
  --shadow-brand-glow: 0 0 28px rgb(59 77 255 / 0.20);
}
```

Esses valores são sugestões de implementação, não medidas extraídas da imagem.

## 08.3 Regras de profundidade

| Camada | Comportamento |
|---|---|
| Canvas | Fundo neutro, sem sombra |
| Card | Borda leve ou sombra baixa |
| Card interativo | Realce sutil no hover/foco |
| Popover / menu | Sombra média e borda |
| Modal / drawer | Overlay + elevação consistente |
| Hero | Pode ter glow e gradiente, sem perder legibilidade |

## 08.4 Glassmorphism

**Uso permitido [NORMA PROPOSTA]:** overlays de marketing, banners, elementos de apresentação.  
**Uso a evitar:** tabelas densas, formulários complexos, textos longos, mensagens de erro.

```css
.qualify-glass {
  background: rgb(255 255 255 / 0.76);
  backdrop-filter: blur(16px);
  border: 1px solid rgb(255 255 255 / 0.60);
}
```

Oferecer fallback sólido em ambientes sem suporte a blur.

## 08.5 Efeitos luminosos

- Glow deve reforçar um ponto de atenção, não aparecer em todos os cards.
- Usar intensidades baixas e compatíveis com foco visual.
- O estado de foco por teclado deve ser mais explícito do que um glow decorativo.
- Não usar animação de pulsação contínua sem motivo operacional.

## 08.6 Motion e transições [NORMA PROPOSTA]

| Interação | Duração sugerida | Curva |
|---|---:|---|
| Hover de botão | 120–180 ms | ease-out |
| Mudança de estado | 150–220 ms | ease-out |
| Modal / drawer | 180–280 ms | ease-in-out |
| Entrada de card | 180–240 ms | ease-out |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Respeitar movimento reduzido e garantir que animação não seja necessária para entender a ação.

---

# 09 — TOKENS CONSOLIDADOS PARA DESENVOLVIMENTO

Esta seção é **[NORMA PROPOSTA]**: uma tradução inicial do painel para um sistema escalável. Não afirma que estes tokens já constam do repositório existente.

## 09.1 Estrutura de nomenclatura

- `brand.*`: identidade pura.
- `surface.*`: camadas de fundo.
- `text.*`: hierarquia do conteúdo.
- `border.*`: separações e contornos.
- `action.*`: elementos interativos.
- `status.*`: feedback e estados.
- `shadow.*`: elevação.
- `radius.*`: geometria.
- `space.*`: ritmo.
- `motion.*`: movimento.

## 09.2 Exemplo CSS de base

```css
:root {
  /* identidade — painel */
  --brand-primary: #3B4DFF;
  --brand-violet: #7C3AED;
  --brand-accent-purple: #8B5CF6;
  --brand-cyan: #06B6D4;
  --brand-green: #10B981;
  --brand-orange: #F97316;

  /* base visual — painel + proposta */
  --surface-canvas: #F1F5F9;
  --surface-default: #FFFFFF;
  --surface-tint: #E8F0FF;
  --border-subtle: #CBD5E1;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-inverse: #FFFFFF;

  /* componentes — propostas */
  --radius-control: 8px;
  --radius-card: 12px;
  --radius-modal: 16px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --transition-fast: 150ms;
  --transition-medium: 220ms;
}
```

**Importante:** `--text-primary` e `--text-secondary`, assim como raios, tempos e sombras acima, são escolhas propostas para completar o sistema e não estão especificados no painel.

## 09.3 Exemplo semântico de interface

```css
.button-primary {
  background: var(--brand-primary);
  color: var(--text-inverse);
  border-radius: var(--radius-control);
  min-height: 40px;
  padding-inline: var(--space-4);
  font-weight: 600;
}
.button-primary:focus-visible {
  outline: 3px solid var(--brand-violet);
  outline-offset: 2px;
}
.card-default {
  background: var(--surface-default);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  padding: var(--space-6);
}
```

Antes de produção, validar contraste de todas as combinações, estilos de hover, dark mode e integração com a biblioteca de componentes real.

## 09.4 Possível arquitetura de arquivos

```text
src/
├── styles/
│   ├── tokens.css
│   ├── typography.css
│   ├── motion.css
│   └── themes.css
├── components/
│   ├── ui/
│   │   ├── Button.*
│   │   ├── Input.*
│   │   ├── Card.*
│   │   ├── Badge.*
│   │   └── Dialog.*
│   ├── layout/
│   │   ├── PageShell.*
│   │   ├── PageHeader.*
│   │   └── AppSidebar.*
│   └── patterns/
│       ├── MetricCard.*
│       ├── DataTable.*
│       ├── EmptyState.*
│       └── FilterToolbar.*
└── assets/
    └── brand/
```

Os nomes são ilustrativos e **não** uma descrição verificada da estrutura atual do projeto.

---

# 10 — REGRAS DE CONSISTÊNCIA ENTRE PEÇAS E TELAS

## 10.1 Produto vs. marketing

**Marketing:** expressividade maior, gradientes, fotografia, texturas, composições hero e mensagens de alto impacto.  
**Produto:** baixa distração, hierarquia funcional, dados claros, estados explícitos, densidade ajustada à tarefa.

Ambos devem compartilhar logo, cores-base, tipografia, iconografia e geometria.

## 10.2 Regras obrigatórias

1. **Uma logo oficial:** não recriar “Qualify” como texto estilizado ou caixa genérica quando houver asset oficial.
2. **Uma cor azul primária:** evitar múltiplos azuis concorrentes sem nomes e funções.
3. **Um gradiente governado:** mesmos stops oficiais e uso seletivo.
4. **Tipografia previsível:** escalas e pesos documentados.
5. **Espaçamento modular:** evitar valores inventados sem necessidade.
6. **Cards com função:** sem efeitos de clique em elementos somente informativos.
7. **Estados completos:** default, hover, focus, disabled, loading, error, empty e success.
8. **Responsividade por tarefa:** não apenas encolher a interface desktop.
9. **Acessibilidade incorporada:** sem depender de revisão apenas no fim.
10. **Documentação viva:** decisões aprovadas devem atualizar tokens, componentes e exemplos.

## 10.3 Checklist de revisão visual

- [ ] A versão da logo corresponde ao fundo?
- [ ] A marca tem proteção e contraste adequados?
- [ ] A cor de ação é a primária oficial?
- [ ] Há apenas um CTA de maior prioridade por contexto?
- [ ] Textos e números possuem contraste e hierarquia suficientes?
- [ ] Cards têm espaçamento e raio padronizados?
- [ ] Ícones mantêm estilo e tamanho coerentes?
- [ ] Botões e inputs têm estados interativos completos?
- [ ] Estados vazios explicam o próximo passo?
- [ ] Tabelas e formulários funcionam em tela pequena?
- [ ] Há suporte a navegação por teclado e foco visível?
- [ ] Os efeitos decorativos não prejudicam a produtividade?
- [ ] As imagens possuem licença e direitos de uso adequados?
- [ ] Claims e métricas ilustrativas foram identificados ou substituídos por dados verificáveis?

---

# 11 — ENTREGÁVEIS NECESSÁRIOS PARA UM BRAND KIT OFICIAL

O painel é uma excelente **visão de direção criativa**, mas um brand kit pronto para execução exige pacotes independentes.

## 11.1 Logos

- [ ] Wordmark azul em SVG vetorial aprovado.
- [ ] Wordmark branco em SVG vetorial aprovado.
- [ ] Versão monocromática preta (se aprovada).
- [ ] Símbolo “Q” vetorial independente (se aprovado).
- [ ] Favicon e ícones de aplicativo em tamanhos definidos.
- [ ] Arquivos transparentes PNG de alta resolução.
- [ ] Versões para fundos claros, escuros e gradientes.
- [ ] Documento de área de proteção e tamanho mínimo validado.
- [ ] Regras de uso incorreto com exemplos visuais.

## 11.2 Identidade

- [ ] Paleta e tokens aprovados.
- [ ] Gradientes com direção e stops oficiais.
- [ ] Fontes e licenças verificadas.
- [ ] Arquivos de padrões e texturas.
- [ ] Biblioteca de ícones e ilustrações.
- [ ] Templates de social, apresentações e documentos.
- [ ] Arquivos de produção com especificação de impressão quando necessário.

## 11.3 Produto digital

- [ ] Biblioteca de componentes acessíveis.
- [ ] Variantes e estados documentados.
- [ ] Temas claro e escuro testados, se ambos forem suportados.
- [ ] Templates responsivos.
- [ ] Regras de microcopy e localização.
- [ ] Auditoria de contraste automatizada e manual.
- [ ] Testes visuais por breakpoint.

---

# 12 — ROADMAP DE IMPLEMENTAÇÃO DA IDENTIDADE

| Etapa | Objetivo | Saída |
|---|---|---|
| **P0 · Aprovação de marca** | Validar arquivos da logo e hex oficiais | Assets vetoriais + paleta aprovados |
| **P1 · Fundamentos** | Publicar tokens, fontes, grid e espaçamentos | Fundação CSS / design tokens |
| **P2 · Componentes** | Padronizar botões, campos, cards, badges, menus | Biblioteca reutilizável |
| **P3 · Telas principais** | Aplicar padrões em login, navegação, dashboard e listagens | Fluxos-piloto consistentes |
| **P4 · Responsividade e a11y** | Testar teclado, contraste, zoom e mobile | Critérios de qualidade atendidos |
| **P5 · Comunicação** | Criar templates e assets institucionais | Brand kit operacional |
| **P6 · Governança** | Estabelecer revisão e manutenção | Biblioteca e documentação vivas |

---

# 13 — DECISÕES PENDENTES DE VALIDAÇÃO

1. **O hex exato do azul da logo:** o painel apresenta `#3B4DFF`, mas a cor precisa ser confirmada contra o vetor mestre.
2. **O hex exato do violeta institucional:** `#7C3AED` está no painel; confirmar se é cor primária permanente ou apenas de campanha.
3. **Pontos profundos do gradiente:** a arte de capa usa áreas mais escuras que não têm códigos explícitos.
4. **Arquivos da logo e do símbolo Q:** é necessária a versão vetorial para tamanhos mínimos, favicon e aplicações rigorosas. A prancha complementar de variações é ilustrativa; não equivale aos arquivos SVG/PNG/ICO definitivos.
5. **Tipografia de marca:** Inter é a família indicada para o sistema, não necessariamente a fonte proprietária do wordmark.
6. **Tamanhos de fonte e grid:** a arte não fixa uma escala funcional completa; esta documentação propõe uma.
7. **Raios e sombras:** os detalhes fornecidos no painel são visuais, sem medidas numéricas oficiais.
8. **Dark mode:** o painel ilustra principalmente a linguagem clara e uma assinatura reversa; um tema escuro de produto precisará de tokens semânticos próprios.
9. **Dados de mockups:** valores financeiros, perfis e capturas são conceituais.
10. **Naming de aplicações:** o painel é da marca **Qualify**; adaptações para marcas de produtos internos devem definir relação de endosso e hierarquia de marca, sem pressupor que todos usem a mesma assinatura.

---

# 14 — RESUMO EXECUTIVO DA DIREÇÃO CRIATIVA

A Qualify deve ser reconhecida por uma assinatura simples e memorável, apoiada em **azul intenso, violeta expressivo e superfícies claras**. Sua personalidade é **moderna, confiável e inteligente**. A marca pode explorar gradientes, grids, padrões modulares e efeitos de profundidade em peças institucionais, mas a interface operacional deve concentrar-se em **clareza, legibilidade, velocidade e consistência**.

**Princípio central:** o premium da Qualify não está na quantidade de efeitos. Está em transformar um sistema complexo em uma experiência visual simples, organizada e confiável.

**Tagline de referência:** **Tecnologia, clareza e escala.**

---

*Documento derivado da imagem fornecida. Valores e elementos identificados como [NORMA PROPOSTA] são recomendações de operacionalização, e não regras comprovadamente existentes no manual oficial da marca.*
