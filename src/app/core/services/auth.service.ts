import { Injectable, signal, computed } from '@angular/core';
import type { UserRole } from '../models/user.model';

const SESSION_KEY = 'agendai_sessao';
const USER_KEY = 'agendai_usuario';
const ROLE_KEY = 'agendai_role';
const TOKEN_KEY = 'agendai_token';
const NOME_KEY = 'agendai_nome';
const PERMISSIONS_KEY = 'agendai_permissions';
const PROFESSIONAL_ID_KEY = 'agendai_professional_id';

export interface AuthSessionExtras {
  token: string;
  nome: string;
  permissions: string[];
  professionalId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _authenticated = signal<boolean>(
    sessionStorage.getItem(SESSION_KEY) === '1'
  );
  private readonly _usuario = signal<string | null>(sessionStorage.getItem(USER_KEY));
  private readonly _role = signal<UserRole | null>(
    (sessionStorage.getItem(ROLE_KEY) as UserRole) ?? null
  );
  private readonly _nome = signal<string | null>(sessionStorage.getItem(NOME_KEY));
  private readonly _professionalId = signal<string | null>(
    sessionStorage.getItem(PROFESSIONAL_ID_KEY)
  );
  private readonly _permissions = signal<string[]>(this.loadPermissions());

  readonly authenticated = this._authenticated.asReadonly();
  readonly usuario = this._usuario.asReadonly();
  readonly role = this._role.asReadonly();
  readonly nome = this._nome.asReadonly();
  readonly professionalId = this._professionalId.asReadonly();
  readonly permissions = this._permissions.asReadonly();

  readonly isAuth$ = computed(() => this._authenticated());
  readonly user$ = computed(() => this._usuario());
  readonly role$ = computed(() => this._role());

  isAuthenticated(): boolean {
    return this._authenticated();
  }

  currentUser(): string | null {
    return this._usuario();
  }

  currentRole(): UserRole | null {
    return this._role();
  }

  currentProfessionalId(): string | null {
    return this._professionalId();
  }

  hasPermission(permission: string): boolean {
    return this._permissions().includes(permission);
  }

  login(usuario: string, role: UserRole, extras?: AuthSessionExtras): void {
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.setItem(USER_KEY, usuario);
    sessionStorage.setItem(ROLE_KEY, role);

    if (extras) {
      sessionStorage.setItem(TOKEN_KEY, extras.token);
      sessionStorage.setItem(NOME_KEY, extras.nome);
      sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(extras.permissions));
      if (extras.professionalId) {
        sessionStorage.setItem(PROFESSIONAL_ID_KEY, extras.professionalId);
      } else {
        sessionStorage.removeItem(PROFESSIONAL_ID_KEY);
      }

      this._nome.set(extras.nome);
      this._permissions.set(extras.permissions);
      this._professionalId.set(extras.professionalId);
    }

    this._authenticated.set(true);
    this._usuario.set(usuario);
    this._role.set(role);
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(NOME_KEY);
    sessionStorage.removeItem(PERMISSIONS_KEY);
    sessionStorage.removeItem(PROFESSIONAL_ID_KEY);

    this._authenticated.set(false);
    this._usuario.set(null);
    this._role.set(null);
    this._nome.set(null);
    this._permissions.set([]);
    this._professionalId.set(null);
  }

  private loadPermissions(): string[] {
    try {
      const raw = sessionStorage.getItem(PERMISSIONS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}
