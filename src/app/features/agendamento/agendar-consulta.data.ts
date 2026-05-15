export interface PacienteOption {
  id: string;
  nome: string;
}

export interface ProcedimentoOption {
  id: string;
  nome: string;
  valor: number;
}

export const PACIENTES_MOCK: PacienteOption[] = [
  { id: 'c1', nome: 'Maria Silva Santos' },
  { id: 'c2', nome: 'João Pedro Oliveira' },
  { id: 'c3', nome: 'Ana Luiza Ferreira' },
  { id: 'c4', nome: 'Carlos Eduardo Rocha' },
  { id: 'c5', nome: 'Fernanda Costa Lima' }
];

export const PROCEDIMENTOS_MOCK: ProcedimentoOption[] = [
  { id: 'pr1', nome: 'Consulta clínica geral', valor: 180 },
  { id: 'pr2', nome: 'Consulta de retorno', valor: 120 },
  { id: 'pr3', nome: 'Avaliação cardiológica', valor: 350 },
  { id: 'pr4', nome: 'Eletrocardiograma', valor: 90 },
  { id: 'pr5', nome: 'Consulta dermatológica', valor: 220 },
  { id: 'pr6', nome: 'Pequena cirurgia dermatológica', valor: 450 }
];

/** Faixas de 30 min a partir de cada hora, 08:00–17:30 */
export function opcoesHorarioClinica(): string[] {
  const out: string[] = [];
  for (let h = 8; h < 18; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`);
  }
  return out;
}
