# Spec: Backlog & Inbox

## JTBD
Como usuário, quero (1) uma visão unificada de TODAS as tasks com filtros poderosos para ter controle total, e (2) um inbox rápido para capturar novas ideias/tasks e organizá-las depois.

## Aba Backlog

### Layout
- Aba principal na navegação inferior (substitui "Pendências")
- Lista de todas as tasks do sistema
- Header com filtros

### Filtros disponíveis
Todos combináveis entre si:

| Filtro | Tipo | Opções |
|--------|------|--------|
| Frequência | multi-select chips | Diária, Semanal, Mensal, Anual, Sem data |
| Categoria | multi-select chips | Cozinha, Pedro, Ester, Casa, Pessoal, Espiritual, Compras |
| Pessoa | select pills | Rubens, Diene, Juntos, Todos |

### Comportamento dos filtros
- **Default:** mostrar tudo exceto tasks diárias (para evitar poluição)
- Filtros são "inclusivos" — marcar "Semanal" + "Mensal" mostra ambos
- Chip "Sem data" mostra tasks do Inbox (sem recorrência configurada)
- Persistir preferência de filtro no localStorage ou banco

### Exibição das tasks
- Lista agrupada por categoria
- Cada task mostra:
  - Nome
  - Badge de frequência (Diária, Seg/Qua/Sex, Mensal dia 15, etc.)
  - Responsável primário (ícone/dot colorido)
  - Indicador se tem "como" (steps)
  - Indicador se tem protocolo vinculado
- Tasks sem recorrência ("Inbox") têm badge visual distinto (ex: "Sem data" em cinza)

### Interações
- Long press → abre modal de edição
- Tap → expande detalhes (steps, plano B, protocolo)
- Botão "Organizar" em tasks sem data → abre edição focada em recorrência

## Inbox

### Conceito
- O Inbox é um subconjunto do Backlog: tasks com `recurrence.type = 'none'`
- Não é uma aba separada, mas o principal ponto de entrada é o botão flutuante

### Botão Flutuante "+"
- Visível em **todas as telas** do app (Dia, Backlog, SOS)
- Posição: canto inferior direito, acima da nav bar
- Ao clicar: abre form rápido de criação

### Form Rápido de Criação (Inbox)
- Modal/drawer com campos essenciais:
  - Nome (obrigatório)
  - Categoria (obrigatório)
  - Responsável primário (default: usuário logado)
  - Frequência (default: "Sem data" — vai pro inbox)
  - Período (default: MA)
- Botão "Criar" → salva e fecha
- Botão "Criar e adicionar mais" → salva e limpa form para próxima task
- Se frequência ≠ "Sem data", mostra campos condicionais de recorrência

### Seção Inbox no Backlog
- Quando filtro "Sem data" está ativo, mostra seção destacada "Inbox" no topo
- Cada task do inbox tem call-to-action "Agendar" que abre edição de recorrência
- Contador de tasks no inbox visível no badge da aba Backlog

## Migração de Pendências
- Tasks atuais com `frequency: 'S'` (sporadic) migram para o banco com `recurrence.type = 'none'`
- Aba "Pendências" é removida da navegação
- Dados existentes preservados no seed

## Acceptance Criteria
- [ ] Aba "Backlog" substitui "Pendências" na navegação
- [ ] Filtros de frequência, categoria e pessoa funcionam e são combináveis
- [ ] Default exclui tasks diárias
- [ ] Tasks agrupadas por categoria com badges de frequência corretos
- [ ] Long press abre edição em qualquer task do backlog
- [ ] Botão "+" flutuante visível em todas as telas
- [ ] Form rápido cria task com campos essenciais
- [ ] Task sem frequência vai para Inbox automaticamente
- [ ] "Criar e adicionar mais" funciona para cadastro em batch
- [ ] Seção Inbox destacada no Backlog com call-to-action "Agendar"
- [ ] Badge com contador de tasks no inbox
- [ ] Tasks de "Pendências" migradas corretamente para o banco
