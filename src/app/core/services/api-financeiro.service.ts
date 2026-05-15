import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { FormaPagamento } from './atendimento.service';
import type { Lancamento, StatusLancamento, TipoLancamento } from './financeiro.service';

export interface LancamentoApi {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  vencimento: string;
  status: StatusLancamento;
  categoria: string;
  formaPagamento?: FormaPagamento;
  atendimentoId?: string;
  paciente?: string;
  profissional?: string;
  procedimento?: string;
  observacoes?: string;
  criadoEm: string;
}

export interface CriarLancamentoApiRequest {
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  vencimento: string;
  status: StatusLancamento;
  categoria: string;
  formaPagamento?: FormaPagamento;
  observacoes?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiFinanceiroService {
  private readonly http = inject(HttpClient);

  listar(filtros?: {
    dataInicio?: string;
    dataFim?: string;
    tipo?: TipoLancamento;
    status?: StatusLancamento;
  }): Observable<LancamentoApi[]> {
    let params = new HttpParams();
    if (filtros?.dataInicio) params = params.set('dataInicio', filtros.dataInicio);
    if (filtros?.dataFim) params = params.set('dataFim', filtros.dataFim);
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros?.status) params = params.set('status', filtros.status);
    return this.http.get<LancamentoApi[]>(`${environment.apiUrl}/financeiro/lancamentos`, { params });
  }

  criar(body: CriarLancamentoApiRequest): Observable<LancamentoApi> {
    return this.http.post<LancamentoApi>(`${environment.apiUrl}/financeiro/lancamentos`, body);
  }

  atualizarStatus(id: string, status: StatusLancamento): Observable<LancamentoApi> {
    return this.http.patch<LancamentoApi>(`${environment.apiUrl}/financeiro/lancamentos/${id}/status`, { status });
  }

  static toLancamento(api: LancamentoApi): Lancamento {
    return {
      id: api.id,
      tipo: api.tipo,
      descricao: api.descricao,
      valor: api.valor,
      data: api.data,
      vencimento: api.vencimento,
      status: api.status,
      categoria: api.categoria as Lancamento['categoria'],
      formaPagamento: api.formaPagamento,
      atendimentoId: api.atendimentoId,
      paciente: api.paciente,
      profissional: api.profissional,
      procedimento: api.procedimento,
      observacoes: api.observacoes,
      criadoEm: api.criadoEm
    };
  }
}
