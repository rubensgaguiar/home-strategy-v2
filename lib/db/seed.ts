import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import {
  tasks,
  taskRecurrences,
  protocols as protocolsTable,
  categoryContingencies,
} from './schema';

// ── Day-of-week mapping ──────────────────────────────────────────
// JS Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
// Portuguese day names to JS day numbers
const dayMap: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

// ── Category mapping (Title case -> lowercase enum) ──────────────
type OldCategory = 'Cozinha' | 'Pedro' | 'Ester' | 'Casa' | 'Pessoal' | 'Espiritual' | 'Compras';
const categoryMap: Record<OldCategory, 'cozinha' | 'pedro' | 'ester' | 'casa' | 'pessoal' | 'espiritual' | 'compras'> = {
  Cozinha: 'cozinha',
  Pedro: 'pedro',
  Ester: 'ester',
  Casa: 'casa',
  Pessoal: 'pessoal',
  Espiritual: 'espiritual',
  Compras: 'compras',
};

// ── Frequency mapping ────────────────────────────────────────────
// Old: T=daily, W=weekly, Q=biweekly (every 2 weeks), S=none
type OldFrequency = 'T' | 'W' | 'Q' | 'S';

function mapFrequency(freq: OldFrequency): { type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'; interval: number } {
  switch (freq) {
    case 'T': return { type: 'daily', interval: 1 };
    case 'W': return { type: 'weekly', interval: 1 };
    case 'Q': return { type: 'weekly', interval: 2 };
    case 'S': return { type: 'none', interval: 1 };
  }
}

// ── Protocol icon mapping ────────────────────────────────────────
const protocolIcons: Record<string, string> = {
  comida: '\u{1F372}',
  louca: '\u{1F37D}\uFE0F',
  roupa: '\u{1F455}',
  limpeza: '\u{1F9F9}',
};

// ── Source data (inline to avoid import issues with tsx) ──────────

interface OldTask {
  id: string;
  name: string;
  frequency: OldFrequency;
  periods: ('MA' | 'TA' | 'NO')[];
  daysOfWeek?: string[];
  primary: 'rubens' | 'diene' | 'juntos';
  secondary?: 'rubens' | 'diene' | 'juntos' | null;
  category: OldCategory;
  repetitions?: string;
  planB?: string | null;
  optional?: boolean;
}

const SEG_SEX = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
const SEG_SAB = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const oldTasks: OldTask[] = [
  // COZINHA
  { id: 'cafe-manha', name: 'Cafe da manha', frequency: 'T', periods: ['MA'], primary: 'rubens', secondary: 'diene', category: 'Cozinha', planB: 'Pao, fruta, leite. 5 minutos.' },
  { id: 'almoco', name: 'Almoco', frequency: 'T', periods: ['MA'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Congelados, delivery, ou ovo com arroz.' },
  { id: 'lanche', name: 'Lanche', frequency: 'T', periods: ['TA'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Fruta, biscoito ou iogurte. Sem preparo.' },
  { id: 'janta', name: 'Janta', frequency: 'T', periods: ['TA'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Sanduiche, ovos, sobras do almoco ou delivery.' },
  { id: 'lavar-louca', name: 'Lavar louca', frequency: 'T', periods: ['NO'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Deixar de molho. Lavar so essencial. Descartavel se preciso.' },
  { id: 'limpar-mesa', name: 'Limpar mesa', frequency: 'T', periods: ['TA', 'NO'], primary: 'rubens', category: 'Cozinha', planB: 'Pano umido rapido. 2 minutos.' },
  { id: 'ideias-lanche', name: 'Planejar lanches da semana', frequency: 'W', periods: ['NO'], daysOfWeek: ['domingo'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Repetir cardapio da semana passada.' },
  { id: 'ideias-almoco-janta', name: 'Planejar almocos e jantas da semana', frequency: 'W', periods: ['NO'], daysOfWeek: ['domingo'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Repetir cardapio da semana passada.' },
  { id: 'ideias-cafe', name: 'Planejar cafes da manha da semana', frequency: 'W', periods: ['NO'], daysOfWeek: ['domingo'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Repetir cardapio da semana passada.' },
  { id: 'fazer-salgado', name: 'Fazer salgado', frequency: 'Q', periods: ['TA'], daysOfWeek: ['sabado'], primary: 'diene', secondary: 'rubens', category: 'Cozinha', planB: 'Comprar pronto ou adiar pra proxima quinzena.' },
  // PEDRO
  { id: 'passeio-manha', name: 'Passeio manha com Pedro', frequency: 'W', periods: ['MA'], daysOfWeek: [...SEG_SAB], primary: 'diene', secondary: 'rubens', category: 'Pedro', planB: 'Quintal, varanda ou brincadeira dentro de casa.' },
  { id: 'passeio-manha-domingo', name: 'Passeio manha com Pedro', frequency: 'W', periods: ['MA'], daysOfWeek: ['domingo'], primary: 'rubens', secondary: 'diene', category: 'Pedro', planB: 'Quintal, varanda ou brincadeira dentro de casa.' },
  { id: 'passeio-tarde', name: 'Passeio fim de tarde com Pedro', frequency: 'T', periods: ['TA'], primary: 'rubens', secondary: 'diene', category: 'Pedro', planB: 'Quintal ou brincadeira dentro de casa.' },
  { id: 'atividades-pedro-seed', name: 'Atividades Pedro (Seed)', frequency: 'W', periods: ['MA'], daysOfWeek: [...SEG_SEX], primary: 'diene', secondary: 'rubens', category: 'Pedro', planB: 'Brincadeira livre substitui. Nao force.' },
  { id: 'arrumar-brinquedos', name: 'Arrumar brinquedos', frequency: 'T', periods: ['NO'], primary: 'rubens', secondary: 'diene', category: 'Pedro', planB: 'Jogar tudo num cesto grande. 3 minutos.' },
  { id: 'limpar-pedro-pos-refeicao', name: 'Limpar Pedro pos refeicao', frequency: 'T', periods: ['MA', 'TA'], primary: 'diene', secondary: 'rubens', category: 'Pedro', planB: 'Lenco umedecido e troca de roupa rapida.' },
  { id: 'leitura-voz-alta', name: 'Leitura em voz alta', frequency: 'T', periods: ['MA', 'TA'], primary: 'juntos', category: 'Pedro', planB: '5 minutos com 1 livro curto. Ou pular.' },
  { id: 'banho-criancas', name: 'Banho Pedro e Ester', frequency: 'T', periods: ['NO'], primary: 'juntos', category: 'Pedro', planB: 'Banho rapido so com agua. Ou adiar pra amanha.' },
  { id: 'coco-pedro', name: 'Limpar Pedro quando fizer coco', frequency: 'T', periods: ['MA', 'TA'], primary: 'juntos', category: 'Pedro', planB: null },
  { id: 'catecismo', name: 'Catecismo', frequency: 'T', periods: ['MA'], primary: 'juntos', category: 'Pedro', planB: 'Versao curta com 1 pergunta. 2 minutos.' },
  { id: 'filme-pedro', name: 'Filme com Pedro', frequency: 'W', periods: ['TA'], daysOfWeek: ['domingo'], primary: 'rubens', secondary: 'diene', category: 'Pedro', planB: 'Desenho curto no tablet. Ou outro dia.' },
  { id: 'definir-metas-pedro', name: 'Definir metas Pedro', frequency: 'W', periods: ['NO'], daysOfWeek: ['domingo'], primary: 'juntos', category: 'Pedro', planB: 'Adiar pra proxima semana.' },
  // ESTER
  { id: 'amamentar', name: 'Amamentar', frequency: 'T', periods: ['MA', 'TA'], primary: 'diene', category: 'Ester', repetitions: 'N vezes', planB: null },
  { id: 'limpar-coco-ester', name: 'Limpar coco Ester', frequency: 'T', periods: ['MA', 'TA'], primary: 'diene', secondary: 'rubens', category: 'Ester', repetitions: 'N vezes', planB: null },
  { id: 'tummy-time', name: 'Tummy time Ester', frequency: 'T', periods: ['MA'], primary: 'diene', secondary: 'rubens', category: 'Ester', planB: 'Pular. Compensar amanha ou ao longo do dia.' },
  { id: 'colocar-ester-dormir', name: 'Colocar Ester pra dormir', frequency: 'T', periods: ['MA', 'TA'], primary: 'diene', secondary: 'rubens', category: 'Ester', repetitions: 'N vezes', planB: 'Colo, embalar, sling.' },
  { id: 'trocar-agua-garrafa-ester', name: 'Trocar agua da garrafa termica Ester', frequency: 'T', periods: ['NO'], primary: 'diene', secondary: 'rubens', category: 'Ester', planB: 'Se esquecer, fazer de manha cedo.' },
  // CASA
  { id: 'roupa-criancas', name: 'Lavar roupa das criancas', frequency: 'T', periods: ['NO'], primary: 'diene', secondary: 'rubens', category: 'Casa', planB: 'Usar roupa reserva. Lavar amanha cedo.' },
  { id: 'estender-roupa', name: 'Estender roupa', frequency: 'T', periods: ['NO'], primary: 'diene', secondary: 'rubens', category: 'Casa', planB: 'Estender de manha. Nao estraga overnight na maquina.' },
  { id: 'passar-robo', name: 'Passar robo no chao', frequency: 'T', periods: ['NO'], primary: 'rubens', category: 'Casa', planB: 'Pular. Varrer area principal se necessario.' },
  { id: 'trocar-lixo', name: 'Trocar lixo', frequency: 'T', periods: ['NO'], primary: 'rubens', category: 'Casa', planB: 'Se nao esta cheio, amanha. Se esta, 2 minutos.' },
  { id: 'organizar-casa', name: 'Organizar casa', frequency: 'T', periods: ['NO'], primary: 'rubens', secondary: 'diene', category: 'Casa', planB: 'Jogar tudo num cesto e guardar amanha.' },
  { id: 'trocar-roupa-cama', name: 'Trocar roupa de cama', frequency: 'W', periods: ['MA'], daysOfWeek: ['sabado'], primary: 'diene', secondary: 'rubens', category: 'Casa', planB: 'Pode ir 2 semanas sem trocar. Pular sem culpa.' },
  { id: 'lavar-toalhas', name: 'Lavar toalhas', frequency: 'W', periods: ['MA'], daysOfWeek: ['sabado'], primary: 'diene', secondary: 'rubens', category: 'Casa', planB: 'Pular 1 semana. Usar toalha reserva.' },
  { id: 'roupa-adulto', name: 'Lavar roupa adulto', frequency: 'W', periods: ['MA'], daysOfWeek: ['sabado'], primary: 'diene', secondary: 'rubens', category: 'Casa', planB: 'Repetir roupa 1-2 dias. Ninguem nota.' },
  { id: 'limpar-chao', name: 'Limpar chao', frequency: 'W', periods: ['TA'], daysOfWeek: ['sabado'], primary: 'rubens', secondary: 'diene', category: 'Casa', planB: 'Robo resolve o basico. Pular faxina manual.' },
  { id: 'passar-pano-quartos', name: 'Passar pano nos quartos', frequency: 'W', periods: ['TA'], daysOfWeek: ['sabado'], primary: 'rubens', secondary: 'diene', category: 'Casa', planB: 'Pular. Semana que vem.' },
  { id: 'lavar-trocar-tapetes', name: 'Lavar/trocar tapetes', frequency: 'W', periods: ['TA'], daysOfWeek: ['sabado'], primary: 'rubens', secondary: 'diene', category: 'Casa', planB: 'Pular. Quinzenal esta ok.' },
  { id: 'arrumar-coisas-casa', name: 'Arrumar coisas da casa (pias, cortinas, etc)', frequency: 'W', periods: ['TA'], daysOfWeek: ['sabado'], primary: 'rubens', secondary: 'diene', category: 'Casa', planB: 'Priorizar so 1 item da lista. Resto fica.' },
  { id: 'lavar-banheiro', name: 'Lavar banheiro', frequency: 'W', periods: ['NO'], daysOfWeek: ['quarta'], primary: 'rubens', secondary: 'diene', category: 'Casa', planB: 'Lenco desinfetante nas superficies. 5 minutos.' },
  { id: 'organizar-financeiro', name: 'Organizar financeiro mensal', frequency: 'W', periods: ['NO'], daysOfWeek: ['segunda'], primary: 'diene', secondary: 'rubens', category: 'Casa', planB: 'Adiar 1 dia. Nao e urgente semanal.' },
  // COMPRAS
  { id: 'mercado-assai', name: 'Mercado Assai', frequency: 'W', periods: ['NO'], daysOfWeek: ['quarta'], primary: 'rubens', secondary: 'diene', category: 'Compras', planB: 'Adiar pra quinta. Ou fazer lista e pedir online.' },
  { id: 'comprar-frutas-verduras', name: 'Comprar frutas e verduras', frequency: 'W', periods: ['NO'], daysOfWeek: ['quarta'], primary: 'rubens', secondary: 'diene', category: 'Compras', planB: 'Comprar junto com Assai. Ou adiar 1 dia.' },
  { id: 'bigbox-celular', name: 'BigBox (pedido online)', frequency: 'W', periods: ['TA'], daysOfWeek: ['sabado'], primary: 'rubens', secondary: 'diene', category: 'Compras', planB: 'Adiar. Checar se realmente precisa essa semana.' },
  { id: 'mikami-celular', name: 'Mikami (pedido online)', frequency: 'W', periods: ['TA'], daysOfWeek: ['sabado'], primary: 'rubens', secondary: 'diene', category: 'Compras', planB: 'Adiar. Checar se realmente precisa essa semana.' },
  // PESSOAL
  { id: 'trabalho-rubens-semana', name: 'Trabalho Rubens (9h-17h + 20:30h-23:30h)', frequency: 'W', periods: ['MA', 'TA'], daysOfWeek: [...SEG_SEX], primary: 'rubens', category: 'Pessoal' },
  { id: 'trabalho-rubens-sabado', name: 'Trabalho Rubens (manha)', frequency: 'W', periods: ['MA'], daysOfWeek: ['sabado'], primary: 'rubens', category: 'Pessoal' },
  { id: 'atividade-fisica-diene', name: 'Atividade fisica Diene (correr/forca)', frequency: 'W', periods: ['MA'], daysOfWeek: [...SEG_SEX], primary: 'diene', category: 'Pessoal', planB: '10 min de alongamento em casa. Ou pular.' },
  { id: 'exercicio-rubens', name: 'Exercicio fisico Rubens', frequency: 'T', periods: ['NO'], primary: 'rubens', category: 'Pessoal', optional: true, planB: '10 min de alongamento. Ou amanha.' },
  { id: 'ver-cursos', name: 'Ver cursos', frequency: 'T', periods: ['NO'], primary: 'rubens', category: 'Pessoal', optional: true, planB: 'Pular. Zero culpa.' },
  { id: 'estudos-proprio', name: 'Estudos proprio', frequency: 'T', periods: ['NO'], primary: 'rubens', category: 'Pessoal', optional: true, planB: 'Pular. Zero culpa.' },
  { id: 'leitura-livros', name: 'Leitura de livros', frequency: 'T', periods: ['NO'], primary: 'juntos', category: 'Pessoal', optional: true, planB: 'Pular. Zero culpa.' },
  { id: 'organizar-construcao', name: 'Organizar construcao da casa', frequency: 'T', periods: ['NO'], primary: 'rubens', category: 'Pessoal', optional: true, planB: 'Pular. Zero culpa.' },
  // ESPIRITUAL
  { id: 'culto-domestico', name: 'Culto domestico', frequency: 'T', periods: ['MA'], primary: 'juntos', category: 'Espiritual', planB: '1 oracao juntos. 2 minutos.' },
  { id: 'culto-manha-domingo', name: 'Culto de manha', frequency: 'W', periods: ['MA'], daysOfWeek: ['domingo'], primary: 'juntos', category: 'Espiritual', planB: 'Culto domestico em casa substitui.' },
  { id: 'culto-noturno-domingo', name: 'Culto noturno', frequency: 'W', periods: ['NO'], daysOfWeek: ['domingo'], primary: 'juntos', category: 'Espiritual', planB: 'Pular sem culpa. Semana que vem.' },
  { id: 'gf', name: 'GF', frequency: 'W', periods: ['NO'], daysOfWeek: ['quinta'], primary: 'juntos', category: 'Espiritual', planB: 'Avisar o grupo e ir na proxima semana.' },
  // BACKLOG
  { id: 'devocional-individual', name: 'Devocional individual', frequency: 'S', periods: [], primary: 'juntos', category: 'Espiritual' },
  { id: 'fisio', name: 'Fisio', frequency: 'S', periods: [], primary: 'diene', category: 'Pessoal' },
  { id: 'vacina', name: 'Vacina', frequency: 'S', periods: [], primary: 'juntos', category: 'Pessoal' },
  { id: 'troca-brinquedos', name: 'Troca de brinquedos', frequency: 'S', periods: [], primary: 'juntos', category: 'Pedro' },
  { id: 'marcar-consulta', name: 'Marcar consulta', frequency: 'S', periods: [], primary: 'diene', secondary: 'rubens', category: 'Pessoal' },
  { id: 'dentista-diene', name: 'Dentista Diene', frequency: 'S', periods: [], primary: 'diene', category: 'Pessoal' },
  { id: 'gap-sabado', name: 'GAP sabado', frequency: 'S', periods: [], primary: 'rubens', category: 'Espiritual' },
];

const oldProtocols = [
  { id: 'comida', name: 'Protocolo Comida', trigger: 'Dia muito dificil, sem energia para cozinhar', actions: ['Verificar congelados disponiveis', 'Se nao tiver, pedir delivery', 'Opcoes rapidas: ovos, macarrao, sanduiche', 'Nao se culpar - nutricao basica e suficiente'], color: 'blue' },
  { id: 'louca', name: 'Protocolo Louca', trigger: 'Louca acumulada, sem tempo para lavar', actions: ['Usar descartaveis temporariamente', 'Lavar apenas o essencial', 'Deixar de molho para facilitar', 'Priorizar mamadeiras/itens das criancas'], color: 'amber' },
  { id: 'roupa', name: 'Protocolo Roupa', trigger: 'Roupa acumulada, criancas sem roupa limpa', actions: ['Lavar apenas roupas das criancas', 'Usar body/macacao simples', 'Adultos podem repetir roupa', 'Fazer uma maquina pequena urgente'], color: 'violet' },
  { id: 'limpeza', name: 'Protocolo Limpeza', trigger: 'Casa muito baguncada, visita inesperada', actions: ['Focar apenas em: sala e banheiro', 'Recolher tudo em uma caixa/cesto', 'Passar pano rapido nas superficies', 'Fechar portas dos quartos', 'Perfeitamente ok nao estar perfeito'], color: 'emerald' },
];

const oldContingencies = [
  { category: 'cozinha' as const, planB: 'Use delivery, comida congelada, ou simplifique para pao com ovo.' },
  { category: 'pedro' as const, planB: 'Redistribua para o outro pai. Se ambos sobrecarregados, ative modo sobrevivencia.' },
  { category: 'ester' as const, planB: 'Redistribua para o outro pai. Se ambos sobrecarregados, ative modo sobrevivencia.' },
  { category: 'casa' as const, planB: 'Pule hoje. Foque so no banheiro e cozinha.' },
  { category: 'compras' as const, planB: 'Adie para amanha ou peca delivery online.' },
  { category: 'pessoal' as const, planB: 'Adie sem culpa. Cuide do essencial primeiro.' },
  { category: 'espiritual' as const, planB: 'Faca uma versao simplificada ou adie para amanha.' },
];

async function seed() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is required');
  }

  const client = postgres(connectionString, { ssl: 'require', max: 1 });
  const db = drizzle(client);

  console.log('Seeding database...');

  // Clear existing data in correct order (respecting foreign keys)
  console.log('Clearing existing data...');
  await db.execute(sql`TRUNCATE TABLE task_completions, task_steps, task_recurrences, tasks, protocols, category_contingencies RESTART IDENTITY CASCADE`);

  // Seed protocols first (tasks may reference them)
  console.log('Seeding protocols...');
  const insertedProtocols = await db.insert(protocolsTable).values(
    oldProtocols.map((p) => ({
      name: p.name,
      trigger: p.trigger,
      actions: p.actions,
      color: p.color,
      icon: protocolIcons[p.id] || null,
    }))
  ).returning();

  // Build protocol name -> id map for linking tasks
  const protocolMap = new Map<string, number>();
  insertedProtocols.forEach((p) => {
    protocolMap.set(p.name, p.id);
  });

  // Map protocol to related categories for task linking
  // comida -> Cozinha tasks, louca -> Cozinha tasks (lavar louca), roupa -> Casa laundry, limpeza -> Casa cleaning
  const taskProtocolLinks: Record<string, string> = {
    'lavar-louca': 'Protocolo Louca',
    'roupa-criancas': 'Protocolo Roupa',
    'estender-roupa': 'Protocolo Roupa',
    'roupa-adulto': 'Protocolo Roupa',
  };

  // Seed tasks with recurrences
  console.log('Seeding tasks...');
  for (let i = 0; i < oldTasks.length; i++) {
    const t = oldTasks[i];
    const freq = mapFrequency(t.frequency);

    const protocolName = taskProtocolLinks[t.id];
    const protocolId = protocolName ? protocolMap.get(protocolName) : undefined;

    // Insert task
    const [insertedTask] = await db.insert(tasks).values({
      name: t.name,
      category: categoryMap[t.category],
      primaryPerson: t.primary,
      secondaryPerson: t.secondary || null,
      repetitions: t.repetitions || null,
      planB: t.planB || null,
      optional: t.optional || false,
      sortOrder: i,
      protocolId: protocolId || null,
    }).returning();

    // Insert recurrence
    const daysOfWeek = t.daysOfWeek
      ? t.daysOfWeek.map((d) => dayMap[d])
      : freq.type === 'daily'
        ? null // daily doesn't need days_of_week
        : null;

    await db.insert(taskRecurrences).values({
      taskId: insertedTask.id,
      type: freq.type,
      interval: freq.interval,
      daysOfWeek: daysOfWeek,
      periods: t.periods.length > 0 ? t.periods : [],
    });
  }

  // Seed category contingencies
  console.log('Seeding category contingencies...');
  await db.insert(categoryContingencies).values(oldContingencies);

  console.log(`Seeded ${oldTasks.length} tasks, ${oldProtocols.length} protocols, ${oldContingencies.length} contingencies.`);
  console.log('Seed complete.');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
