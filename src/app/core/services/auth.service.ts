import { Injectable, signal, computed } from '@angular/core';
import type { UserRole } from '../models/user.model';

const SESSION_KEY = 'agendai_sessao';
const USER_KEY    = 'agendai_usuario';
const ROLE_KEY    = 'agendai_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ─── Estado reativo ────────────────────────────────────────────────────
  private readonly _authenticated = signal<boolean>(
    sessionStorage.getItem(SESSION_KEY) === '1'
  );
  private readonly _usuario = signal<string | null>(
    sessionStorage.getItem(USER_KEY)
  );
  private readonly _role = signal<UserRole | null>(
    (sessionStorage.getItem(ROLE_KEY) as UserRole) ?? null
  );

  // ─── Leitura pública (signals / computed) ──────────────────────────────
  readonly authenticated = this._authenticated.asReadonly();
  readonly usuario        = this._role; // exposto via currentUser()
  readonly role           = this._role.asReadonly();

  isAuthenticated(): boolean {
    return this._authenticated();
  }

  currentUser(): string | null {
    return this._usuario();
  }

  currentRole(): UserRole | null {
    return this._role();
  }

  // ─── Computed signals para uso direto em templates / services ──────────
  readonly isAuth$    = computed(() => this._authenticated());
  readonly user$      = computed(() => this._usuario());
  readonly role$      = computed(() => this._role());

  // ─── Ações ────────────────────────────────────────────────────────────
  login(usuario: string, role: UserRole): void {
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.setItem(USER_KEY, usuario);
    sessionStorage.setItem(ROLE_KEY, role);

    this._authenticated.set(true);
    this._usuario.set(usuario);
    this._role.set(role);
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ROLE_KEY);

    this._authenticated.set(false);
    this._usuario.set(null);
    this._role.set(null);
  }
}
