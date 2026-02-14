# Spec: Views - Dia, Semana, Mês

## JTBD
Como usuário, quero visualizar minhas tasks organizadas por dia (focus/timeline), semana e mês, filtrando automaticamente as recorrências menores, para planejar e executar minha rotina em diferentes horizontes de tempo.

## Navegação Principal

### Estrutura: 3 abas + menu
- **Aba "Dia"** (principal) — Focus View e Timeline View (toggle)
- **Aba "Backlog"** — Visão unificada com filtros
- **Aba "SOS"** — Protocolos de emergência

### Acesso a Semana e Mês
- Dentro da aba "Dia", toggle/menu para alternar entre:
  - **Hoje** (view atual - Focus ou Timeline)
  - **Semana** (lista agrupada por dia)
  - **Mês** (lista agrupada por dia do mês)

## View: Dia (Existente, com melhorias)

### Focus View
- Mantém a view atual: 1 task por vez, grande, com progress ring
- **Novos elementos:**
  - Botão "Não feito" (✗) — marca task como não feita, avança para próxima
  - Botão "Pular" — avança sem registrar nada
  - Setas ← → para navegar entre tasks
  - Swipe esquerda/direita para navegar (gesture no mobile)
  - Seção "Como fazer" — mostra checklist de steps (só referência, sem persistir marcação)
  - Botão "Ver protocolo" — se task tem protocolo vinculado, abre modal do protocolo

### Timeline View
- Mantém a view atual: tasks agrupadas por período (MA, TA, NO)
- **Novos elementos:**
  - Checkbox com 3 estados: ✓ feito, ✗ não feito, vazio (pendente)
  - Long press abre modal de edição
  - Drag-and-drop para reordenar dentro do período
  - Indicador de "como" (ícone se a task tem steps)

### Filtros (mantém existentes)
- Seletor de dia (7 dias da semana)
- Filtro por pessoa (Rubens, Diene, Todos)
- Toggle Focus/Timeline

## View: Semana (Nova)

### Layout
- Lista agrupada por dia da semana (Segunda → Domingo)
- Cada dia é uma seção colapsável

### Conteúdo
- Mostra apenas tasks **semanais, mensais e anuais** que caem naquela semana
- **Exclui tasks diárias** (para evitar poluição visual)
- Dentro de cada dia, agrupa por período (MA, TA, NO)

### Interações
- Marcar como feito/não feito direto na lista
- Long press para editar task
- Indicador visual de progresso por dia

### Navegação temporal
- Setas para navegar entre semanas (← semana anterior | semana seguinte →)
- Indicador de "Semana atual" com destaque no dia de hoje

## View: Mês (Nova)

### Layout
- Lista agrupada por dia do mês (1 → 28/30/31)
- Mostra apenas dias que têm tasks

### Conteúdo
- Mostra apenas tasks **mensais e anuais**
- **Exclui tasks diárias e semanais**
- Cada dia mostra as tasks com período e responsável

### Interações
- Marcar como feito/não feito
- Long press para editar
- Indicador de progresso do mês

### Navegação temporal
- Setas para navegar entre meses (← mês anterior | mês seguinte →)
- Nome do mês + ano no header

## Progresso

### Cálculo de progresso
- **3 estados:** done (✓), not_done (✗), skipped (neutro)
- Progresso = tasks done / total de tasks essenciais (não-opcionais)
- Tasks "skipped" não contam no denominador nem numerador
- Tasks "not_done" contam no denominador mas não no numerador

### Exibição
- **Focus View:** Progress ring (circular) — mantém existente
- **Timeline View:** Barra de progresso por período + total do dia
- **Semana View:** Progresso por dia + total da semana
- **Mês View:** Progresso total do mês

## Acceptance Criteria
- [ ] Toggle dentro de "Dia" permite alternar entre Hoje, Semana e Mês
- [ ] View Semana mostra tasks agrupadas por dia, excluindo diárias
- [ ] View Mês mostra tasks agrupadas por dia do mês, excluindo diárias e semanais
- [ ] Navegação temporal funciona (semana anterior/próxima, mês anterior/próximo)
- [ ] Focus View tem botões Feito, Não Feito, Pular e setas de navegação
- [ ] Swipe gesture funciona no Focus View para navegar entre tasks
- [ ] Seção "Como fazer" aparece no Focus View quando task tem steps
- [ ] Botão "Ver protocolo" aparece quando task tem protocolo vinculado
- [ ] Timeline View suporta 3 estados (feito, não feito, pendente)
- [ ] Long press abre edição em qualquer view
- [ ] Drag-and-drop reordena tasks na Timeline
- [ ] Progresso calculado corretamente com 3 estados
- [ ] Filtro por pessoa funciona em todas as views
