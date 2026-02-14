# Spec: Recurrence System

## JTBD
Como usuário, quero definir padrões de recorrência flexíveis para minhas tasks (diário, semanal, mensal, anual, com intervalos customizados) para que o sistema calcule automaticamente em quais dias cada task aparece.

## Tipos de Recorrência

### Daily (Diário)
- **Padrão:** Todo dia
- **Com intervalo:** A cada N dias (ex: a cada 2 dias, a cada 3 dias)
- **Campos:** type='daily', interval=N, periods=[MA/TA/NO]
- **Exemplos:** Café da manhã (todo dia), Medicação (a cada 2 dias)

### Weekly (Semanal)
- **Padrão:** Toda semana no(s) dia(s) especificado(s)
- **Com intervalo:** A cada N semanas (ex: quinzenal = interval 2)
- **Campos:** type='weekly', interval=N, days_of_week=[0-6], periods=[MA/TA/NO]
- **Exemplos:** Feira (quarta), Igreja (domingo manhã e noite), Faxina (sábado a cada 2 semanas)

### Monthly (Mensal)
- **Por dia do mês:** Dia específico (1-31)
- **Por semana do mês + dia:** "1ª segunda do mês", "3º sábado", "último dia"
- **Com intervalo:** A cada N meses
- **Campos:** type='monthly', interval=N, day_of_month=X OU (week_of_month=X, days_of_week=[Y]), periods
- **Exemplos:** Pagar contas (dia 5), Limpeza profunda (1º sábado do mês)

### Yearly (Anual)
- **Data específica:** Dia e mês
- **Campos:** type='yearly', interval=1, day_of_month=X, month_of_year=Y, periods
- **Exemplos:** Aniversário Pedro (dia 15/março), Renovação documento (dia 1/julho)

### None (Sem recorrência)
- Task sem data definida, vive no Inbox/Backlog
- **Campos:** type='none'
- **Exemplos:** Levar ao dentista, Comprar brinquedo novo

## Lógica de Resolução

### Função `getTasksForDate(date: Date): Task[]`
Dado uma data, retorna todas as tasks que devem aparecer naquele dia:

1. **Daily:** Se `interval === 1`, aparece todo dia. Se `interval > 1`, calcular com base na data de referência (created_at ou start_date da recurrence).
2. **Weekly:** Verificar se `date.getDay()` está em `days_of_week`. Se `interval > 1`, verificar se a semana atual é a correta no ciclo.
3. **Monthly:** Se `day_of_month`, verificar se `date.getDate() === day_of_month`. Se `week_of_month + days_of_week`, calcular a Nª ocorrência daquele dia da semana no mês.
4. **Yearly:** Verificar mês e dia.
5. **None:** Nunca aparece por data (só no Backlog/Inbox).

### Função `getTasksForWeek(weekStart: Date): Map<DayOfWeek, Task[]>`
Retorna tasks agrupadas por dia da semana, excluindo tasks diárias.

### Função `getTasksForMonth(year: number, month: number): Map<number, Task[]>`
Retorna tasks agrupadas por dia do mês, excluindo tasks diárias e semanais.

## UI de Configuração de Recorrência

### No form de criação/edição
1. Usuário seleciona **tipo** (Diário, Semanal, Mensal, Anual, Sem data)
2. Campos condicionais aparecem:
   - **Diário:** "A cada __ dias" (default 1 = "todo dia")
   - **Semanal:** Chips dos dias da semana (seg-dom) + "A cada __ semanas" (default 1)
   - **Mensal:** Toggle "Dia do mês" vs "Semana do mês" + campos correspondentes + "A cada __ meses"
   - **Anual:** Selecionar mês e dia
   - **Sem data:** Nenhum campo extra
3. Seleção de **períodos** (MA, TA, NO) como chips multi-select

### Preview
- Mostrar texto descritivo da recorrência: "Todo dia", "Toda segunda e quarta", "Dia 15 de cada mês", "A cada 2 semanas no sábado"

## Acceptance Criteria
- [ ] Tasks diárias aparecem todo dia na view "Dia"
- [ ] Tasks com intervalo (a cada N dias) aparecem nos dias corretos
- [ ] Tasks semanais aparecem nos dias da semana configurados
- [ ] Tasks quinzenais aparecem a cada 2 semanas nos dias corretos
- [ ] Tasks mensais (por dia) aparecem no dia correto do mês
- [ ] Tasks mensais (por semana) aparecem na Nª ocorrência correta do dia
- [ ] Tasks anuais aparecem na data correta
- [ ] Tasks sem data não aparecem em nenhuma view de calendário
- [ ] UI de recorrência mostra campos condicionais corretos por tipo
- [ ] Preview textual mostra descrição legível da recorrência configurada
- [ ] `getTasksForDate`, `getTasksForWeek`, `getTasksForMonth` retornam dados corretos
