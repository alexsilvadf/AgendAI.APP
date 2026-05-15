import { Injectable, signal, computed } from '@angular/core';
import { type Paciente, type HistoricoItem, anamneseVazia } from '../models/paciente.model';

const STORAGE_KEY    = 'agendai_pacientes';
const SCHEMA_VERSION = 'v1';
const VERSION_KEY    = 'agendai_pacientes_version';

// ─── Pacientes mock ────────────────────────────────────────────────────────
const PACIENTES_INICIAIS: Paciente[] = [
  {
    id: 'p1',
    nome: 'Maria Silva Santos',
    cpf: '123.456.789-00',
    dataNascimento: '1985-03-15',
    sexo: 'feminino',
    estadoCivil: 'casado',
    telefone: '(11) 98765-4321',
    email: 'maria.silva@email.com',
    cep: '01310-100',
    logradouro: 'Av. Paulista',
    numero: '1000',
    complemento: 'Apto 42',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    tipoSanguineo: 'O+',
    anamnese: {
      ...anamneseVazia(),
      temHipertensao: true,
      usaMedicamentoContinuo: true,
      medicamentoContinuoDesc: 'Losartana 50mg'
    },
    historico: [
      {
        id: 'h1',
        data: '2025-02-10',
        procedimento: 'Consulta clínica geral',
        profissional: 'Dra. Ana Martins',
        observacoes: 'Paciente relatou dor de cabeça frequente.',
        valor: 180
      }
    ],
    ativo: true,
    criadoEm: '2025-01-15',
    atualizadoEm: '2025-02-10'
  },
  {
    id: 'p2',
    nome: 'João Pedro Oliveira',
    cpf: '987.654.321-00',
    dataNascimento: '1990-07-22',
    sexo: 'masculino',
    estadoCivil: 'solteiro',
    telefone: '(11) 91234-5678',
    email: 'joao.pedro@email.com',
    cep: '04038-001',
    logradouro: 'Rua Vergueiro',
    numero: '500',
    complemento: '',
    bairro: 'Vila Mariana',
    cidade: 'São Paulo',
    uf: 'SP',
    tipoSanguineo: 'A+',
    anamnese: { ...anamneseVazia(), fumante: true },
    historico: [],
    ativo: true,
    criadoEm: '2025-01-20',
    atualizadoEm: '2025-01-20'
  },
  {
    id: 'p3',
    nome: 'Ana Luiza Ferreira',
    cpf: '456.789.123-00',
    dataNascimento: '1978-11-05',
    sexo: 'feminino',
    estadoCivil: 'divorciado',
    telefone: '(11) 97777-8888',
    email: 'ana.luiza@email.com',
    cep: '05402-100',
    logradouro: 'Rua Oscar Freire',
    numero: '200',
    complemento: 'Casa',
    bairro: 'Jardins',
    cidade: 'São Paulo',
    uf: 'SP',
    tipoSanguineo: 'B+',
    anamnese: {
      ...anamneseVazia(),
      temDiabetes: true,
      temAlergiaMedicamento: true,
      alergiaMedicamentoDesc: 'Dipirona'
    },
    historico: [],
    ativo: true,
    criadoEm: '2025-02-01',
    atualizadoEm: '2025-02-01'
  }
];

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly _pacientes = signal<Paciente[]>(this.loadFromStorage());

  readonly pacientes = this._pacientes.asReadonly();
  readonly ativos    = computed(() => this._pacientes().filter((p) => p.ativo));

  // ─── Persistência ──────────────────────────────────────────────────────
  private loadFromStorage(): Paciente[] {
    try {
      if (localStorage.getItem(VERSION_KEY) !== SCHEMA_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
        return PACIENTES_INICIAIS;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return PACIENTES_INICIAIS;
      const parsed = JSON.parse(raw) as Paciente[];
      if (!Array.isArray(parsed) || parsed.length === 0) return PACIENTES_INICIAIS;
      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return PACIENTES_INICIAIS;
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._pacientes()));
    localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
  }

  // ─── Consultas ─────────────────────────────────────────────────────────
  buscarPorId(id: string): Paciente | undefined {
    return this._pacientes().find((p) => p.id === id);
  }

  cpfExiste(cpf: string, ignorarId?: string): boolean {
    const normalizado = cpf.replace(/\D/g, '');
    return this._pacientes().some(
      (p) => p.cpf.replace(/\D/g, '') === normalizado && p.id !== ignorarId
    );
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────
  criar(dados: Omit<Paciente, 'id' | 'criadoEm' | 'atualizadoEm' | 'historico'>): Paciente {
    const hoje = new Date().toISOString().slice(0, 10);
    const novo: Paciente = {
      ...dados,
      id: `p${Date.now()}`,
      historico: [],
      criadoEm: hoje,
      atualizadoEm: hoje
    };
    this._pacientes.update((list) => [...list, novo]);
    this.persist();
    return novo;
  }

  atualizar(id: string, dados: Partial<Omit<Paciente, 'id' | 'criadoEm' | 'historico'>>): void {
    const hoje = new Date().toISOString().slice(0, 10);
    this._pacientes.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...dados, atualizadoEm: hoje } : p))
    );
    this.persist();
  }

  adicionarHistorico(pacienteId: string, item: Omit<HistoricoItem, 'id'>): void {
    this._pacientes.update((list) =>
      list.map((p) =>
        p.id === pacienteId
          ? {
              ...p,
              historico: [
                ...p.historico,
                { ...item, id: `h${Date.now()}` }
              ],
              atualizadoEm: new Date().toISOString().slice(0, 10)
            }
          : p
      )
    );
    this.persist();
  }

  alternarAtivo(id: string): void {
    this._pacientes.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p))
    );
    this.persist();
  }

  excluir(id: string): void {
    this._pacientes.update((list) => list.filter((p) => p.id !== id));
    this.persist();
  }
}

// re-export para uso externo
export type { HistoricoItem } from '../models/paciente.model';
