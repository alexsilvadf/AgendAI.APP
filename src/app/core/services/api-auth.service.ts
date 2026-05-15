import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { UserRole } from '../models/user.model';
import { AuthService } from './auth.service';

export interface LoginApiResponse {
  token: string;
  expiresIn: number;
  nome: string;
  usuario: string;
  role: UserRole;
  permissions: string[];
  professionalId?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  login(usuario: string, senha: string): Observable<LoginApiResponse> {
    return this.http
      .post<LoginApiResponse>(`${environment.apiUrl}/auth/login`, { usuario, senha })
      .pipe(
        tap((res) => {
          this.auth.login(res.usuario, res.role, {
            token: res.token,
            nome: res.nome,
            permissions: res.permissions,
            professionalId: res.professionalId ?? null
          });
        })
      );
  }
}
