export type Period = 'MA' | 'TA' | 'NO';
export type Frequency = 'T' | 'W' | 'Q' | 'S';
export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
export type Person = 'rubens' | 'diene' | 'juntos';
export type Category = 'Cozinha' | 'Pedro' | 'Ester' | 'Casa' | 'Pessoal' | 'Espiritual' | 'Compras';

export interface Task {
  id: string;
  name: string;
  frequency: Frequency;
  periods: Period[];
  daysOfWeek?: DayOfWeek[];
  primary: Person;
  secondary?: Person | null;
  category: Category;
  repetitions?: string;
  planB?: string | null;
  optional?: boolean;
}

export interface CategoryContingency {
  category: Category;
  planB: string;
}

export interface Protocol {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  color: string;
}
