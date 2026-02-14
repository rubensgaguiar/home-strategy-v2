# Spec: Task Interaction (Feito / Não Feito / Pular / Navegação)

## JTBD
Como usuário, quero interagir com as tasks de forma fluida no Focus View — marcando como feito, não feito, pulando, e navegando com gestos — para executar minha rotina de forma rápida e sem fricção.

## 3 Estados de Completion

### Feito (Done) ✓
- Task foi executada com sucesso
- Card some e avança para próxima task
- Persiste no banco: `status = 'done'`
- Conta positivamente no progresso

### Não Feito (Not Done) ✗
- Task não foi executada (conscientemente)
- Card some e avança para próxima task
- Persiste no banco: `status = 'not_done'`
- Conta negativamente no progresso (está no denominador mas não no numerador)

### Pulado (Skipped)
- Não registra nada no banco — é apenas navegação
- Avança para próxima task
- Task continua "pendente" e pode ser revisitada
- Não afeta cálculo de progresso

## Focus View — Botões de Ação

### Layout dos botões
```
[  ✗ Não feito  ]  [  ← →  ]  [  ✓ Feito  ]
```

- **Não feito** (esquerda): vermelho/destrutivo, marca ✗ e avança
- **Feito** (direita): verde/positivo, marca ✓ e avança
- **Setas ← →** (centro): navegação pura, sem registrar estado

### Botão Pular
- As setas ← → servem como "pular"
- Seta → avança para próxima task
- Seta ← volta para task anterior
- Não registra nenhum estado

## Swipe Gestures (Mobile)

### Comportamento
- **Swipe para direita** → navega para próxima task (equivale a seta →)
- **Swipe para esquerda** → navega para task anterior (equivale a seta ←)
- Swipe é apenas navegação (pular), não marca feito/não feito
- Feedback visual: card desliza na direção do swipe com animação

### Implementação
- Detectar touch events (touchstart, touchmove, touchend)
- Threshold mínimo de 50px para registrar swipe
- Animação de transição suave (slide + fade)
- Funcionar tanto em mobile quanto em desktop (mouse drag)

## Timeline View — Checkbox de 3 estados

### Comportamento
- Tap no checkbox alterna: vazio → ✓ feito → ✗ não feito → vazio
- Ou: 2 botões separados (✓ e ✗) ao lado de cada task
- Visual:
  - Vazio (pendente): checkbox vazio
  - Feito: checkbox verde com ✓
  - Não feito: checkbox vermelho com ✗

## Persistência

### API
- `POST /api/completions` — registrar completion
  - Body: `{ task_id, date, status, user_email }`
- `GET /api/completions?date=YYYY-MM-DD` — buscar completions do dia
- `DELETE /api/completions/[id]` — desfazer (se mudar de ideia)

### Regras
- Apenas 1 completion por task por data por usuário
- Se já existe completion e usuário marca novamente, atualiza o status
- Ao desfazer (voltar para pendente), deleta o registro

## Animações

### Transição entre tasks (Focus View)
- Card atual desliza para fora (esquerda ou direita)
- Novo card desliza para dentro (do lado oposto)
- Duração: 200-300ms
- Easing: ease-out

### Marcação de feito
- Breve animação de confirmação (scale pop + cor verde)
- Delay de 200ms antes de transicionar para próxima task

### Marcação de não feito
- Breve shake + cor vermelha
- Delay de 200ms antes de transicionar

## Acceptance Criteria
- [ ] Botão "Feito" marca ✓, persiste no banco, avança para próxima
- [ ] Botão "Não Feito" marca ✗, persiste no banco, avança para próxima
- [ ] Setas ← → navegam sem registrar estado
- [ ] Swipe direita/esquerda navega entre tasks no mobile
- [ ] Swipe tem threshold mínimo e animação suave
- [ ] Timeline View mostra 3 estados visuais no checkbox
- [ ] Progresso calcula: done / (done + not_done) — skipped não conta
- [ ] Apenas 1 completion por task/data/usuário
- [ ] Desfazer completion é possível (voltar para pendente)
- [ ] Animações de transição, confirmação e erro funcionam
