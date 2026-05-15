import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { FormaPagamento } from './atendimento.service';

export interface AtendimentoApi {
  id: string;
  professionalId: string;
  profissional: string;
  paciente: string;
  procedimento: string;
  data: string;
  hora: string;
  valor: number;
  observacoes: string;
  dentes: string;
  retorno: boolean;
  pago: boolean;
  formaPagamento?: FormaPagamento;
  parcelas?: number;
  agendamentoId?: string;
}

export interface CriarAtendimentoApiRequest {
  profissionalId: string;
  pacienteId: string;
  procedimentoId: string;
  data: string;
  hora: string;
  valor: number;
  observacoes: string;
  dentes: string;
  retorno: boolean;
  agendamentoId?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiAtendimentoService {
  private readonly http = inject(HttpClient);

  listar(filtros?: { data?: string; profissionalId?: string; pago?: boolean }): Observable<AtendimentoApi[]> {
    let params = new HttpParams();
    if (filtros?.data) params = params.set('data', filtros.data);
    if (filtros?.profissionalId) params = params.set('profissionalId', filtros.profissionalId);
    if (filtros?.pago !== undefined) params = params.set('pago', String(filtros.pago));
    return this.http.get<AtendimentoApi[]>(`${environment.apiUrl}/atendimentos`, { params });
  }

  criar(body: CriarAtendimentoApiRequest): Observable<AtendimentoApi> {
    return this.http.post<AtendimentoApi>(`${environment.apiUrl}/atendimentos`, body);
  }

  registrarPagamento(
    id: string,
    formaPagamento: FormaPagamento,
    parcelas?: number
  ): Observable<AtendimentoApi> {
    return this.http.post<AtendimentoApi>(`${environment.apiUrl}/atendimentos/${id}/pagar`, {
      formaPagamento,
      parcelas
    });
  }
}
