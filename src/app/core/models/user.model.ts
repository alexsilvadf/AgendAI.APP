// ─── Papéis disponíveis no sistema ────────────────────────────────────────
export type UserRole = 'administrador' | 'dentista' | 'recepcionista';

// ─── Permissões granulares ─────────────────────────────────────────────────
export type Permission =
  | 'agenda:view'
  | 'agenda:edit'
  | 'agendamento:create'
  | 'agendamento:cancel'
  | 'pacientes:view'
  | 'pacientes:edit'
  | 'procedimentos:view'
  | 'procedimentos:edit'
  | 'financeiro:view'
  | 'financeiro:edit'
  | 'usuarios:view'
  | 'usuarios:edit'
  | 'atendimento:create';

// ─── Mapa RBAC: papel → permissões ────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  administrador: [
    'agenda:view',        'agenda:edit',
    'agendamento:create', 'agendamento:cancel',
    'pacientes:view',     'pacientes:edit',
    'procedimentos:view', 'procedimentos:edit',
    'financeiro:view',    'financeiro:edit',
    'usuarios:view',      'usuarios:edit',
    'atendimento:create'
  ],
  dentista: [
    'agendamento:create', 'agendamento:cancel',
    'pacientes:view',
    'procedimentos:view',
    'atendimento:create'
  ],
  recepcionista: [
    // Apenas: agenda, agendar consulta e cadastro de pacientes
    'agenda:view',        'agenda:edit',
    'agendamento:create', 'agendamento:cancel',
    'pacientes:view',     'pacientes:edit'
  ]
};

// ─── Labels para exibição ──────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  dentista:      'Dentista',
  recepcionista: 'Recepcionista'
};

// ─── Modelo de usuário ─────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  nome: string;
  usuario: string;        // login
  senha: string;          // hash em produção; plaintext apenas no mock
  role: UserRole;
  especialidade?: string; // relevante para dentistas
  ativo: boolean;
  criadoEm: string;       // ISO date
}
