import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CriarAgendamentoApiRequest {
  profissionalId: string;
  pacienteId: string;
  procedimentoId: string;
  data: string;
  hora: string;
  valor?: number;
  observacoes?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiAgendamentoService {
  private readonly http = inject(HttpClient);

  criar(request: CriarAgendamentoApiRequest): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/agendamentos`, request);
  }

  cancelar(id: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/agendamentos/${id}/cancelar`, {});
  }

  remarcar(id: string, novaHora: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/agendamentos/${id}/remarcar`, { novaHora });
  }
}
