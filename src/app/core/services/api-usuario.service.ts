import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { UserRole } from '../models/user.model';

export interface UsuarioApi {
  id: string;
  nome: string;
  usuario: string;
  role: UserRole;
  especialidade?: string;
  ativo: boolean;
  criadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class ApiUsuarioService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UsuarioApi[]> {
    return this.http.get<UsuarioApi[]>(`${environment.apiUrl}/usuarios`);
  }
}
