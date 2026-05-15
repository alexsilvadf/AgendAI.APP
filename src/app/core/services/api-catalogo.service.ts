import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PacienteResumoApi {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  ativo: boolean;
}

export interface PacienteDetalheApi extends PacienteResumoApi {
  dataNascimento: string;
  sexo: string;
  estadoCivil: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  tipoSanguineo: string;
  anamnese?: Record<string, unknown>;
  historico: Array<{
    id: string;
    data: string;
    procedimento: string;
    profissional: string;
    observacoes: string;
    valor: number;
  }>;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ProcedimentoApi {
  id: string;
  nome: string;
  valor: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class ApiCatalogoService {
  private readonly http = inject(HttpClient);

  listarPacientes(nome?: string): Observable<PacienteResumoApi[]> {
    const url = nome
      ? `${environment.apiUrl}/pacientes?nome=${encodeURIComponent(nome)}`
      : `${environment.apiUrl}/pacientes`;
    return this.http.get<PacienteResumoApi[]>(url);
  }

  listarProcedimentosAtivos(): Observable<ProcedimentoApi[]> {
    return this.http.get<ProcedimentoApi[]>(`${environment.apiUrl}/procedimentos/ativos`);
  }

  obterPaciente(id: string): Observable<PacienteDetalheApi> {
    return this.http.get<PacienteDetalheApi>(`${environment.apiUrl}/pacientes/${id}`);
  }
}
