# Spec: Database & Data Model

## JTBD
Como usuário do Home Strategy, quero que meus dados (tasks, protocolos, progresso) estejam persistidos num banco de dados para que eu possa acessar de qualquer dispositivo e editar tudo pela UI.

## Contexto
- Migrar de dados hardcoded (`lib/tasks.ts`, `lib/protocols.ts`, `lib/contingencies.ts`) para PostgreSQL (Neon) com Drizzle ORM
- Seguir padrões do projeto `content-manager` para setup de Neon + Drizzle
- Manter autenticação existente (NextAuth com Google OAuth, whitelist de 2 emails)

## Schema do Banco de Dados

### Tabela `tasks`
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID auto-increment |
| name | text | sim | Nome da task |
| category | enum | sim | 'cozinha', 'pedro', 'ester', 'casa', 'pessoal', 'espiritual', 'compras' |
| primary_person | enum | sim | 'rubens', 'diene', 'juntos' |
| secondary_person | enum | não | Responsável secundário |
| plan_b | text | não | Plano B / contingência |
| optional | boolean | não | Se a task é opcional (default false) |
| sort_order | integer | não | Ordem de exibição dentro do período |
| protocol_id | integer FK | não | Protocolo de emergência vinculado |
| created_at | timestamp | sim | Data de criação |
| updated_at | timestamp | sim | Data de atualização |

### Tabela `task_recurrences`
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID auto-increment |
| task_id | integer FK | sim | Referência à task |
| type | enum | sim | 'daily', 'weekly', 'monthly', 'yearly', 'none' |
| interval | integer | não | A cada N (dias/semanas/meses). Default 1 |
| days_of_week | integer[] | não | 0=dom, 1=seg, ..., 6=sab. Para weekly. |
| day_of_month | integer | não | Dia do mês (1-31). Para monthly. |
| month_of_year | integer | não | Mês do ano (1-12). Para yearly. |
| week_of_month | integer | não | Semana do mês (1-5, -1=última). Para "1º sábado do mês". |
| periods | enum[] | sim | ['MA', 'TA', 'NO'] - períodos do dia |

### Tabela `task_steps` (checklist do "como")
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID auto-increment |
| task_id | integer FK | sim | Referência à task |
| description | text | sim | Texto do passo |
| sort_order | integer | sim | Ordem do passo |

### Tabela `protocols`
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID auto-increment |
| name | text | sim | Nome do protocolo |
| trigger | text | sim | Quando ativar |
| actions | text[] | sim | Lista de ações/passos |
| color | text | sim | Cor do protocolo (hex ou nome) |
| icon | text | não | Emoji ou ícone |
| created_at | timestamp | sim | Data de criação |
| updated_at | timestamp | sim | Data de atualização |

### Tabela `task_completions` (histórico)
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID auto-increment |
| task_id | integer FK | sim | Referência à task |
| date | date | sim | Data da execução |
| status | enum | sim | 'done', 'not_done', 'skipped' |
| user_email | text | sim | Quem marcou |
| created_at | timestamp | sim | Momento da marcação |

### Tabela `category_contingencies`
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID auto-increment |
| category | enum | sim | Categoria (unique) |
| plan_b | text | sim | Plano B da categoria |

### Índices
- `task_completions`: índice composto em (task_id, date)
- `task_completions`: índice em (date, user_email)
- `task_recurrences`: índice em (task_id)
- `task_steps`: índice em (task_id)
- `tasks`: índice em (category), (primary_person)

## Migração de Dados
- Script de seed que popula o banco com as ~70 tasks atuais de `lib/tasks.ts`
- Seed dos 4 protocolos existentes de `lib/protocols.ts`
- Seed das contingências de categoria de `lib/contingencies.ts`
- Usuário ajusta/reorganiza depois pela UI

## Setup Técnico
- Conexão: `postgres` client com SSL (`ssl: 'require'`) via `POSTGRES_URL`
- Drizzle ORM com schema tipado
- Migrações SQL em `lib/db/migrations/`
- Runner de migração em `lib/db/migrate.ts`
- Script de seed em `lib/db/seed.ts`

## Multi-dispositivo
- Sem realtime: cada usuário recarrega para ver dados atualizados
- Progresso de completions é compartilhado via banco (ambos veem)

## Acceptance Criteria
- [ ] Banco Neon configurado e acessível via Drizzle
- [ ] Todas as tabelas criadas com tipos corretos e relações
- [ ] Script de seed popula tasks, protocolos e contingências atuais sem perda de dados
- [ ] App lê tasks do banco em vez de `lib/tasks.ts`
- [ ] App lê protocolos do banco em vez de `lib/protocols.ts`
- [ ] Completion tracking usa banco em vez de localStorage
- [ ] Histórico de completions é persistido por data, task e usuário
