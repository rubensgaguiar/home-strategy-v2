# Spec: Task CRUD

## JTBD
Como usuário, quero criar, editar, reordenar e deletar tasks pelo app para personalizar completamente minha rotina sem precisar mexer em código.

## Criar Task

### Acesso
- Botão flutuante "+" visível em qualquer tela do app
- Abre formulário de criação rápida (modal/drawer)

### Campos do Formulário (criação)
| Campo | Tipo | Obrigatório | Default |
|-------|------|-------------|---------|
| Nome | text input | sim | - |
| Frequência | select | sim | 'none' (vai pro inbox) |
| Período do dia | multi-select chips | sim | ['MA'] |
| Responsável primário | select | sim | usuário logado |
| Categoria | select | sim | - |
| Dia da semana | multi-select (se semanal) | condicional | - |
| Dia do mês | number (se mensal) | condicional | - |

### Campos opcionais (editáveis depois)
- Responsável secundário
- Plano B (texto livre)
- "Como" / steps (checklist de passos)
- Protocolo vinculado (select dos protocolos existentes)
- Opcional (toggle)
- Intervalo de recorrência (a cada N)

### Comportamento
- Task criada sem frequência vai para o Inbox automaticamente
- Task com frequência aparece no dia/view correspondente imediatamente
- Validação: nome obrigatório, mínimo 2 caracteres

## Editar Task

### Acesso
- **Long press / hold** em qualquer task (Focus View ou Timeline) abre modal de edição
- Modal mostra todos os campos (essenciais + opcionais)

### Campos editáveis
- Todos os campos da criação
- Campos adicionais: sort_order (via drag-and-drop, não campo direto), steps do "como"

### Edição do "Como" (Steps)
- Dentro do modal de edição, seção "Como fazer"
- Lista de passos com texto livre
- Adicionar/remover/reordenar passos
- Cada passo é um item de checklist (só referência visual, sem persistir progresso)

### Vincular Protocolo
- Dropdown dentro da edição da task
- Lista protocolos existentes
- Ao vincular, na view da task aparece botão para "Ver protocolo de emergência"

## Reordenar Tasks

### Acesso
- Drag-and-drop na Timeline View para reordenar tasks dentro de um período
- Atualiza campo `sort_order` no banco

### Comportamento
- Reordenação é livre dentro de cada período (MA, TA, NO)
- Ordem afeta a sequência no Focus View
- Ao criar nova task, ela vai para o final da lista do período

## Deletar Task

### Acesso
- Dentro do modal de edição, botão "Excluir" com confirmação
- Confirmação: "Tem certeza? O histórico de completions será mantido."

### Comportamento
- Soft delete ou hard delete (hard delete com cascade em task_steps e task_recurrences)
- Completions históricas são mantidas (referência à task por ID, mesmo deletada)

## API Routes

### `GET /api/tasks`
- Lista todas as tasks com recurrences e steps
- Query params: category, person, frequency_type

### `POST /api/tasks`
- Cria task + recurrence + steps numa transação

### `GET /api/tasks/[id]`
- Retorna task com recurrence, steps e protocolo vinculado

### `PUT /api/tasks/[id]`
- Atualiza task + recurrence + steps

### `DELETE /api/tasks/[id]`
- Deleta task, recurrence e steps (cascade)

### `PATCH /api/tasks/reorder`
- Recebe array de {task_id, sort_order} e atualiza em batch

## Acceptance Criteria
- [ ] Botão "+" flutuante abre form de criação em qualquer tela
- [ ] Form de criação tem campos essenciais (nome, freq, período, responsável, categoria)
- [ ] Campos condicionais aparecem baseado na frequência escolhida
- [ ] Long press em task abre modal de edição com todos os campos
- [ ] Edição do "como" permite adicionar/remover/reordenar steps
- [ ] Protocolo pode ser vinculado/desvinculado de uma task
- [ ] Drag-and-drop reordena tasks dentro de um período
- [ ] Task pode ser deletada com confirmação
- [ ] Todas as operações persistem no banco via API
- [ ] Validações impedem dados inválidos (nome vazio, etc.)
