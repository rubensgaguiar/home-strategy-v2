# Spec: Protocols CRUD

## JTBD
Como usuário, quero criar, editar e deletar protocolos de emergência para adaptar os planos de contingência à realidade da família, e vincular protocolos a tasks específicas.

## Modelo de Dados
Campos do protocolo (conforme spec 01):
- **Nome** (obrigatório): Ex: "Protocolo Comida"
- **Trigger** (obrigatório): Quando usar. Ex: "Dia muito difícil, sem energia para cozinhar"
- **Ações** (obrigatório): Lista ordenada de passos/ações
- **Cor** (obrigatório): Cor visual do card (hex ou nome Tailwind)
- **Ícone** (opcional): Emoji representativo

## View SOS (Atualizada)

### Layout
- Mantém design atual: cards com borda colorida à esquerda
- Cada card mostra: ícone, nome, trigger, ações numeradas
- **Novo:** Botão de editar (ícone lápis) no canto superior direito de cada card
- **Novo:** Botão "Novo protocolo" no final da lista

### Interações
- **Tap no card:** Expande/colapsa ações (comportamento atual)
- **Tap no lápis:** Abre modal de edição
- **Tap "Novo protocolo":** Abre modal de criação

## Modal de Criação/Edição

### Campos
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | text input | sim |
| Trigger | textarea | sim |
| Ações | lista de text inputs | sim (mínimo 1) |
| Cor | color picker (predefinidas) | sim |
| Ícone | emoji picker ou text input | não |

### Gestão de Ações
- Lista de campos de texto, 1 por ação
- Botão "+" para adicionar nova ação
- Botão "✗" para remover ação
- Drag-and-drop para reordenar ações
- Mínimo 1 ação obrigatória

### Cores predefinidas
Paleta de cores selecionáveis (baseada nas existentes):
- Azul (blue-500)
- Âmbar (amber-500)
- Violeta (violet-500)
- Esmeralda (emerald-500)
- Vermelho (red-500)
- Rosa (pink-500)
- Índigo (indigo-500)
- Cinza (gray-500)

## Deletar Protocolo

### Acesso
- Dentro do modal de edição, botão "Excluir"
- Confirmação obrigatória

### Comportamento
- Se protocolo está vinculado a tasks, avisar: "Este protocolo está vinculado a N tasks. Desvincular e excluir?"
- Ao excluir, tasks vinculadas perdem a referência (protocol_id = null)

## Vínculo Task ↔ Protocolo

### Na edição da task
- Campo "Protocolo" com dropdown listando protocolos existentes
- Opção "Nenhum" para desvincular

### Na view da task (Focus View)
- Se task tem protocolo vinculado, mostrar botão "Ver protocolo de emergência"
- Botão abre modal com o protocolo completo (trigger + ações)
- Estilizado com a cor do protocolo

## API Routes

### `GET /api/protocols`
- Lista todos os protocolos

### `POST /api/protocols`
- Cria novo protocolo

### `PUT /api/protocols/[id]`
- Atualiza protocolo

### `DELETE /api/protocols/[id]`
- Deleta protocolo (desvincula tasks)

## Migração
- 4 protocolos existentes são migrados via seed
- Mapeamento de cores atuais para novas cores do banco

## Acceptance Criteria
- [ ] View SOS mostra protocolos existentes (migrados do seed)
- [ ] Botão "Novo protocolo" cria protocolo com todos os campos
- [ ] Edição de protocolo funciona (todos os campos editáveis)
- [ ] Ações podem ser adicionadas, removidas e reordenadas
- [ ] Color picker funciona com paleta predefinida
- [ ] Deletar protocolo pede confirmação e avisa sobre tasks vinculadas
- [ ] Tasks podem vincular/desvincular protocolos na edição
- [ ] Focus View mostra botão "Ver protocolo" quando task tem vínculo
- [ ] Modal do protocolo mostra trigger + ações com estilo correto
- [ ] API routes funcionam para CRUD completo
