// ─── Tipos auxiliares ──────────────────────────────────────────────────────
export type Sexo         = 'masculino' | 'feminino' | 'outro' | 'nao_informado';
export type EstadoCivil  = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'outro';
export type TipoSanguineo =
  | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'nao_informado';

// ─── Anamnese (ficha de saúde) ─────────────────────────────────────────────
export interface Anamnese {
  temDoencaCardiaca:       boolean;
  temDiabetes:             boolean;
  temHipertensao:          boolean;
  temCoagulopatia:         boolean;
  temAlergiaMedicamento:   boolean;
  alergiaMedicamentoDesc:  string;
  temAlergiaMaterial:      boolean;
  alergiaMaterialDesc:     string;
  usaMedicamentoContinuo:  boolean;
  medicamentoContinuoDesc: string;
  estaGravida:             boolean;
  fumante:                 boolean;
  observacoesGerais:       string;
}

// ─── Entrada no histórico clínico ─────────────────────────────────────────
export interface HistoricoItem {
  id:            string;
  data:          string;   // ISO date
  procedimento:  string;
  profissional:  string;
  observacoes:   string;
  valor:         number;
}

// ─── Paciente completo ─────────────────────────────────────────────────────
export interface Paciente {
  id:             string;
  // Dados pessoais
  nome:           string;
  cpf:            string;
  dataNascimento: string;   // ISO date
  sexo:           Sexo;
  estadoCivil:    EstadoCivil;
  telefone:       string;
  email:          string;
  // Endereço
  cep:            string;
  logradouro:     string;
  numero:         string;
  complemento:    string;
  bairro:         string;
  cidade:         string;
  uf:             string;
  // Saúde
  tipoSanguineo:  TipoSanguineo;
  anamnese:       Anamnese;
  // Histórico
  historico:      HistoricoItem[];
  // Controle
  ativo:          boolean;
  criadoEm:       string;   // ISO date
  atualizadoEm:   string;   // ISO date
}

// ─── Anamnese vazia (default) ──────────────────────────────────────────────
export function anamneseVazia(): Anamnese {
  return {
    temDoencaCardiaca:       false,
    temDiabetes:             false,
    temHipertensao:          false,
    temCoagulopatia:         false,
    temAlergiaMedicamento:   false,
    alergiaMedicamentoDesc:  '',
    temAlergiaMaterial:      false,
    alergiaMaterialDesc:     '',
    usaMedicamentoContinuo:  false,
    medicamentoContinuoDesc: '',
    estaGravida:             false,
    fumante:                 false,
    observacoesGerais:       ''
  };
}

// ─── Labels ────────────────────────────────────────────────────────────────
export const SEXO_LABELS: Record<Sexo, string> = {
  masculino:    'Masculino',
  feminino:     'Feminino',
  outro:        'Outro',
  nao_informado: 'Não informado'
};

export const ESTADO_CIVIL_LABELS: Record<EstadoCivil, string> = {
  solteiro:   'Solteiro(a)',
  casado:     'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo:      'Viúvo(a)',
  outro:      'Outro'
};

export const TIPO_SANGUINEO_OPTIONS: TipoSanguineo[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'nao_informado'
];
