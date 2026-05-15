import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ApiCatalogoService,
  type PacienteDetalheApi,
  type PacienteResumoApi
} from './api-catalogo.service';
import {
  type Paciente,
  type HistoricoItem,
  type Sexo,
  type EstadoCivil,
  type TipoSanguineo,
  anamneseVazia,
  type Anamnese
} from '../models/paciente.model';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly api = inject(ApiCatalogoService);
  private readonly _pacientes = signal<Paciente[]>([]);
  private readonly _carregando = signal(false);

  readonly pacientes = this._pacientes.asReadonly();
  readonly ativos = computed(() => this._pacientes().filter((p) => p.ativo));

  constructor() {
    this.carregar();
  }

  carregar(nome?: string): void {
    this._carregando.set(true);
    this.api.listarPacientes(nome).subscribe({
      next: (resumos) => {
        this._pacientes.set(resumos.map((r) => this.resumoParaPaciente(r)));
        this._carregando.set(false);
      },
      error: () => this._carregando.set(false)
    });
  }

  buscarPorId(id: string): Paciente | undefined {
    return this._pacientes().find((p) => p.id === id);
  }

  carregarDetalhe(id: string): void {
    this.api.obterPaciente(id).subscribe({
      next: (detalhe) => {
        const paciente = this.detalheParaPaciente(detalhe);
        this._pacientes.update((list) => {
          const existe = list.some((p) => p.id === id);
          return existe ? list.map((p) => (p.id === id ? paciente : p)) : [...list, paciente];
        });
      }
    });
  }

  cpfExiste(cpf: string, ignorarId?: string): boolean {
    const normalizado = cpf.replace(/\D/g, '');
    return this._pacientes().some(
      (p) => p.cpf.replace(/\D/g, '') === normalizado && p.id !== ignorarId
    );
  }

  criar(dados: Omit<Paciente, 'id' | 'criadoEm' | 'atualizadoEm' | 'historico'>): Paciente {
    const hoje = new Date().toISOString().slice(0, 10);
    const novo: Paciente = {
      ...dados,
      id: `local_${Date.now()}`,
      historico: [],
      criadoEm: hoje,
      atualizadoEm: hoje
    };
    this._pacientes.update((list) => [...list, novo]);
    return novo;
  }

  atualizar(id: string, dados: Partial<Omit<Paciente, 'id' | 'criadoEm' | 'historico'>>): void {
    const hoje = new Date().toISOString().slice(0, 10);
    this._pacientes.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...dados, atualizadoEm: hoje } : p))
    );
  }

  /** Histórico é persistido no backend ao registrar atendimento. */
  adicionarHistorico(_pacienteId: string, _item: Omit<HistoricoItem, 'id'>): void {
    // no-op
  }

  alternarAtivo(id: string): void {
    this._pacientes.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p))
    );
  }

  excluir(id: string): void {
    this._pacientes.update((list) => list.filter((p) => p.id !== id));
  }

  private resumoParaPaciente(r: PacienteResumoApi): Paciente {
    return {
      id: r.id,
      nome: r.nome,
      cpf: r.cpf,
      dataNascimento: '',
      sexo: 'nao_informado',
      estadoCivil: 'outro',
      telefone: r.telefone,
      email: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: 'SP',
      tipoSanguineo: 'nao_informado',
      anamnese: anamneseVazia(),
      historico: [],
      ativo: r.ativo,
      criadoEm: '',
      atualizadoEm: ''
    };
  }

  private detalheParaPaciente(d: PacienteDetalheApi): Paciente {
    const anamnese = (d.anamnese ?? {}) as Record<string, unknown>;
    return {
      id: d.id,
      nome: d.nome,
      cpf: d.cpf,
      dataNascimento: d.dataNascimento,
      sexo: d.sexo as Sexo,
      estadoCivil: d.estadoCivil as EstadoCivil,
      telefone: d.telefone,
      email: d.email,
      cep: d.cep,
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento,
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf,
      tipoSanguineo: d.tipoSanguineo as TipoSanguineo,
      anamnese: {
        temDoencaCardiaca: Boolean(anamnese['temDoencaCardiaca']),
        temDiabetes: Boolean(anamnese['temDiabetes']),
        temHipertensao: Boolean(anamnese['temHipertensao']),
        temCoagulopatia: Boolean(anamnese['temCoagulopatia']),
        temAlergiaMedicamento: Boolean(anamnese['temAlergiaMedicamento']),
        alergiaMedicamentoDesc: String(anamnese['alergiaMedicamentoDesc'] ?? ''),
        temAlergiaMaterial: Boolean(anamnese['temAlergiaMaterial']),
        alergiaMaterialDesc: String(anamnese['alergiaMaterialDesc'] ?? ''),
        usaMedicamentoContinuo: Boolean(anamnese['usaMedicamentoContinuo']),
        medicamentoContinuoDesc: String(anamnese['medicamentoContinuoDesc'] ?? ''),
        estaGravida: Boolean(anamnese['estaGravida']),
        fumante: Boolean(anamnese['fumante']),
        observacoesGerais: String(anamnese['observacoesGerais'] ?? '')
      } satisfies Anamnese,
      historico: d.historico.map((h) => ({
        id: h.id,
        data: h.data,
        procedimento: h.procedimento,
        profissional: h.profissional,
        observacoes: h.observacoes,
        valor: h.valor
      })),
      ativo: d.ativo,
      criadoEm: d.criadoEm,
      atualizadoEm: d.atualizadoEm
    };
  }
}

export type { HistoricoItem } from '../models/paciente.model';
