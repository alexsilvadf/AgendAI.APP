import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { DaySchedule, Professional } from '../../features/agenda/agenda.types';

@Injectable({ providedIn: 'root' })
export class ApiAgendaService {
  private readonly http = inject(HttpClient);

  listarProfissionais(): Observable<Professional[]> {
    return this.http.get<Professional[]>(`${environment.apiUrl}/profissionais`);
  }

  obterGrade(data: string, profissionalId?: string): Observable<DaySchedule[]> {
    let params = new HttpParams().set('data', data);
    if (profissionalId && profissionalId !== 'all') {
      params = params.set('profissionalId', profissionalId);
    }
    return this.http.get<DaySchedule[]>(`${environment.apiUrl}/agenda`, { params });
  }
}
