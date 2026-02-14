# Spec: Dashboard & Analytics

## JTBD
Como usuario, quero visualizar estatisticas e tendencias de execucao das tasks ao longo do tempo (semanal, mensal) para identificar padroes, ajustar a rotina e celebrar progresso.

## Contexto
- O app hoje so mostra progresso do dia atual
- Sem visibilidade historica, e dificil saber se a rotina esta funcionando
- Dados de completions no banco permitem analises retroativas
- Dashboard deve ser simples e motivacional, nao um painel complexo

## Acesso
- Nova aba no menu ou secao acessivel via header/menu do usuario
- Ou: secao no topo da view "Dia" que expande para mostrar analytics
- Priorizar mobile-first: cards compactos com informacoes chave

## Metricas Principais

### Taxa de Conclusao Diaria
- Grafico de barras dos ultimos 7 dias (ou 14 dias)
- Cada barra = tasks done / tasks essenciais do dia
- Cor: verde se >= 80%, amarelo se >= 50%, vermelho se < 50%
- Meta visual: linha horizontal em 80%

### Streak (Sequencia)
- Dias consecutivos com >= 80% de conclusao de tasks essenciais
- Exibicao proeminente: numero grande com icone de fogo
- "Recorde pessoal" salvo localmente ou no banco
- Streak quebra se um dia fica abaixo de 80%

### Resumo Semanal
- Total de tasks feitas vs total esperado na semana
- Comparacao com semana anterior (seta para cima/baixo + percentual)
- Categorias com melhor e pior desempenho

### Distribuicao por Pessoa
- Quem completou mais tasks esta semana (Rubens vs Diene)
- Grafico simples de pizza ou barra dividida
- Objetivo nao e competir, mas garantir equilibrio

### Tasks Mais Puladas
- Top 3-5 tasks com menor taxa de conclusao no periodo
- Sugere revisao: task muito dificil? Precisa de plano B melhor? Deve ser removida?
- Periodo: ultimos 30 dias

## Resumo Semanal (Tela)

### Layout
- Card com titulo "Semana X/Y" (numero da semana no ano)
- Metricas em grid 2x2:
  1. Taxa geral: "87% concluido"
  2. Streak: "5 dias seguidos"
  3. Melhor categoria: "Cozinha: 95%"
  4. Atencao: "Ester: 62%"
- Grafico de barras dos 7 dias

## Resumo Mensal (Tela)

### Layout
- Card com titulo do mes: "Janeiro 2026"
- Calendario heat map: cada dia colorido pela taxa de conclusao
  - Verde escuro: >= 90%
  - Verde claro: >= 70%
  - Amarelo: >= 50%
  - Vermelho: < 50%
  - Cinza: sem dados
- Metricas do mes:
  - Media de conclusao
  - Melhor dia / pior dia
  - Tasks mais consistentes
  - Tasks que precisam de atencao

## API
- Usa `GET /api/completions/history?start_date=...&end_date=...` (Spec 08)
- Calculo de metricas feito no cliente (dados ja disponivel via history API)
- Ou: endpoint dedicado `GET /api/analytics/summary?period=week|month` para performance

## Acceptance Criteria
- [ ] Dashboard acessivel via navegacao do app
- [ ] Grafico de barras mostra taxa de conclusao dos ultimos 7 dias
- [ ] Streak calculado corretamente (dias >= 80%)
- [ ] Resumo semanal mostra comparacao com semana anterior
- [ ] Distribuicao por pessoa visivel e equilibrada
- [ ] Tasks mais puladas listadas com sugestao de revisao
- [ ] Calendario heat map no resumo mensal
- [ ] Carregamento rapido (dados cacheados ou pre-calculados)
- [ ] Design mobile-first, compacto e motivacional
