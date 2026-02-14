# Spec: Completion History & Tracking

## JTBD
Como usuário, quero que o sistema registre o histórico de execução das tasks (feito, não feito, pulado) por dia e por pessoa, para ter visibilidade do que foi e não foi feito ao longo do tempo.

## Modelo de Dados
Tabela `task_completions` (conforme spec 01):
- task_id (FK → tasks)
- date (date)
- status ('done', 'not_done', 'skipped')
- user_email (quem marcou)
- created_at (timestamp)

Constraint: unique(task_id, date) — 1 registro por task por dia.

**Nota:** "Skipped" neste contexto é diferente do "pular" na navegação. No Focus View, "pular" (setas/swipe) não gera registro. "Skipped" como status de completion seria usado se futuramente houver necessidade de marcar explicitamente que uma task foi conscientemente ignorada naquele dia. Por ora, os 2 estados persistidos são `done` e `not_done`.

## Fluxo de Registro

### Marcar como Feito
1. Usuário clica "Feito" (Focus View) ou checkbox ✓ (Timeline)
2. `POST /api/completions` com `{ task_id, date: today, status: 'done', user_email }`
3. Se já existe registro para task+date, atualiza status (UPSERT)

### Marcar como Não Feito
1. Usuário clica "Não feito" (Focus View) ou checkbox ✗ (Timeline)
2. `POST /api/completions` com `{ task_id, date: today, status: 'not_done', user_email }`
3. UPSERT (mesma lógica)

### Desfazer
1. Usuário volta task para "pendente" (Timeline: clica no checkbox marcado)
2. `DELETE /api/completions` onde task_id + date match
3. Registro removido, task volta a ser "pendente"

## Cálculo de Progresso

### Fórmula
```
progresso = tasks_done / tasks_essenciais_do_dia
```

Onde:
- `tasks_done`: completions com status 'done' para aquele dia
- `tasks_essenciais_do_dia`: total de tasks não-opcionais que aparecem naquele dia (via recurrence)
- Tasks com status 'not_done' NÃO contam no numerador
- Tasks sem completion (pendentes) NÃO contam no numerador
- Tasks opcionais NÃO contam no denominador

### Por período
- Mesmo cálculo mas filtrado por período (MA, TA, NO)

### Por pessoa
- Filtra tasks pelo `primary_person` ou `secondary_person`

## API Routes

### `POST /api/completions`
- Cria ou atualiza completion (UPSERT por task_id + date)
- Body: `{ task_id, date, status }`
- User email extraído da sessão (NextAuth)
- Retorna: completion criada/atualizada

### `GET /api/completions`
- Query params: `date` (obrigatório), `user_email` (opcional)
- Retorna: lista de completions para aquele dia
- Usado para carregar estado ao abrir o app

### `DELETE /api/completions/[id]`
- Remove completion específica
- Usado para "desfazer" marcação

### `GET /api/completions/history`
- Query params: `start_date`, `end_date`, `task_id` (opcional)
- Retorna: completions no período
- Usado para futuros relatórios/visualizações de histórico

## Transição de localStorage

### Migração
- Dados atuais de localStorage (`hs-checks-YYYY-MM-DD-{dayOfWeek}`) são descartados
- Não há migração de histórico do localStorage (só tinha IDs marcados como "done")
- A partir do deploy, novo histórico começa no banco

### Remoção
- Remover hook `useChecks` baseado em localStorage
- Substituir por hook `useCompletions` que usa API/banco
- Manter mesma interface pública para minimizar mudanças nos componentes

## Acceptance Criteria
- [ ] Completions são salvas no banco com task_id, date, status, user_email
- [ ] UPSERT funciona (marcar feito → depois não feito atualiza o registro)
- [ ] Desfazer remove o registro do banco
- [ ] Progresso calculado corretamente: done / essenciais do dia
- [ ] Tasks opcionais excluídas do denominador
- [ ] Tasks "not_done" contam no denominador mas não no numerador
- [ ] API retorna completions para uma data específica
- [ ] API suporta query de histórico por range de datas
- [ ] Hook `useCompletions` substitui `useChecks` com mesma interface
- [ ] localStorage não é mais usado para tracking
