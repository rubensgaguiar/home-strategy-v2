import { Protocol } from './types';

export const protocols: Protocol[] = [
  {
    id: 'comida',
    name: 'Protocolo Comida',
    trigger: 'Dia muito dificil, sem energia para cozinhar',
    actions: [
      'Verificar congelados disponiveis',
      'Se nao tiver, pedir delivery',
      'Opcoes rapidas: ovos, macarrao, sanduiche',
      'Nao se culpar - nutricao basica e suficiente',
    ],
    color: 'blue',
  },
  {
    id: 'louca',
    name: 'Protocolo Louca',
    trigger: 'Louca acumulada, sem tempo para lavar',
    actions: [
      'Usar descartaveis temporariamente',
      'Lavar apenas o essencial',
      'Deixar de molho para facilitar',
      'Priorizar mamadeiras/itens das criancas',
    ],
    color: 'amber',
  },
  {
    id: 'roupa',
    name: 'Protocolo Roupa',
    trigger: 'Roupa acumulada, criancas sem roupa limpa',
    actions: [
      'Lavar apenas roupas das criancas',
      'Usar body/macacao simples',
      'Adultos podem repetir roupa',
      'Fazer uma maquina pequena urgente',
    ],
    color: 'violet',
  },
  {
    id: 'limpeza',
    name: 'Protocolo Limpeza',
    trigger: 'Casa muito baguncada, visita inesperada',
    actions: [
      'Focar apenas em: sala e banheiro',
      'Recolher tudo em uma caixa/cesto',
      'Passar pano rapido nas superficies',
      'Fechar portas dos quartos',
      'Perfeitamente ok nao estar perfeito',
    ],
    color: 'emerald',
  },
];
