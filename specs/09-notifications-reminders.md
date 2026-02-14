# Spec: Notifications & Reminders

## JTBD
Como usuario, quero receber lembretes automaticos no inicio de cada periodo do dia (manha, tarde, noite) com um resumo das tasks pendentes, para que eu nao precise lembrar de abrir o app e nao perca nenhuma tarefa importante.

## Contexto
- O app hoje depende de o usuario lembrar de abri-lo
- Com criancas pequenas (Pedro e Ester), e facil esquecer tarefas no meio do caos
- Ambos os pais (Rubens e Diene) precisam ser lembrados de forma independente
- Push notifications via Web Push API + Service Worker

## Tipos de Notificacao

### Lembrete de Periodo
- **Quando:** Inicio de cada periodo (06h manha, 12h tarde, 18h noite)
- **Conteudo:** "Bom dia! Voce tem N tarefas para a manha." com lista resumida
- **Acao ao clicar:** Abre o app no Focus View do periodo atual
- **Configuravel:** Cada periodo pode ser ativado/desativado individualmente

### Lembrete de Fim de Periodo
- **Quando:** 30 minutos antes do fim do periodo (11:30h, 17:30h, 21:00h)
- **Conteudo:** "N tarefas ainda pendentes para este periodo."
- **Condicional:** So envia se houver tasks pendentes (sem completion)
- **Configuravel:** Ativar/desativar

### Resumo Diario
- **Quando:** 21:30h (fim do ultimo periodo)
- **Conteudo:** "Hoje voce completou X de Y tarefas essenciais (Z%)."
- **Acao ao clicar:** Abre o app mostrando progresso do dia

## Configuracao

### Tela de Configuracoes
- Acessivel via menu do usuario (canto superior direito)
- Toggle geral: "Ativar notificacoes"
- Toggles individuais por periodo: Manha, Tarde, Noite
- Toggle: "Lembrete de fim de periodo"
- Toggle: "Resumo diario"
- Horarios sao fixos (nao editaveis por ora)

### Permissao do Navegador
- Ao ativar notificacoes, pedir permissao do browser (Notification.requestPermission)
- Se negado, mostrar instrucoes de como habilitar nas configuracoes do navegador
- Status visual: badge verde (ativas), cinza (desativadas), vermelho (bloqueadas pelo browser)

## Implementacao Tecnica

### Service Worker
- Registrar Service Worker para receber push notifications
- SW lida com evento `push` para exibir notificacao
- SW lida com evento `notificationclick` para abrir/focar o app
- Arquivo: `public/sw.js`

### Push Subscription
- Ao ativar notificacoes, criar push subscription (PushManager.subscribe)
- Salvar subscription no banco (nova tabela `push_subscriptions`)
- Enviar subscription ao servidor via API

### Tabela `push_subscriptions`
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID |
| user_email | text | sim | Email do usuario |
| endpoint | text | sim | Push endpoint URL |
| p256dh | text | sim | Chave publica |
| auth | text | sim | Auth secret |
| created_at | timestamp | sim | Data de criacao |

### Tabela `notification_preferences`
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | serial PK | sim | ID |
| user_email | text | sim | Email (unique) |
| enabled | boolean | sim | Geral ativo/inativo |
| period_start | boolean | sim | Lembrete inicio periodo |
| period_end | boolean | sim | Lembrete fim periodo |
| daily_summary | boolean | sim | Resumo diario |

### Cron / Scheduler
- Usar Vercel Cron Jobs (ou similar) para agendar envios
- Cron roda a cada 30 minutos e verifica:
  1. Se e horario de notificacao (06h, 11:30h, 12h, 17:30h, 18h, 21h, 21:30h)
  2. Quais usuarios tem notificacoes ativas para aquele tipo
  3. Monta payload com tasks pendentes do usuario
  4. Envia web-push para cada subscription ativa

### API Routes
- `POST /api/notifications/subscribe` -- salvar push subscription
- `DELETE /api/notifications/subscribe` -- remover subscription
- `GET /api/notifications/preferences` -- buscar preferencias
- `PUT /api/notifications/preferences` -- atualizar preferencias
- `POST /api/notifications/send` -- endpoint do cron (protegido por secret)

## Acceptance Criteria
- [ ] Service Worker registrado e funcional
- [ ] Push subscription criada e salva no banco ao ativar
- [ ] Lembrete de inicio de periodo enviado nos horarios corretos
- [ ] Lembrete de fim de periodo enviado se houver tasks pendentes
- [ ] Resumo diario enviado as 21:30h
- [ ] Clicar na notificacao abre o app na view correta
- [ ] Configuracoes permitem ativar/desativar cada tipo
- [ ] Notificacoes respeitam preferencias individuais de cada usuario
- [ ] Funciona em iOS Safari (PWA) e Android Chrome
- [ ] Feedback visual do status de permissao do browser
