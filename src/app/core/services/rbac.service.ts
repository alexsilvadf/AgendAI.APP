import { Injectable, computed, inject } from '@angular/core';
import { ROLE_PERMISSIONS, type Permission } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RbacService {
  private readonly auth = inject(AuthService);

  /** Papel do usuário logado — reativo via signal */
  readonly currentRole = computed(() => this.auth.role$());

  /** Permissões do usuário logado — recalculadas ao trocar de role */
  readonly permissions = computed((): Permission[] => {
    const role = this.currentRole();
    if (!role) return [];
    return ROLE_PERMISSIONS[role];
  });

  /** Computed signal de permissão individual — use em templates */
  can(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }

  canAll(...perms: Permission[]): boolean {
    return perms.every((p) => this.can(p));
  }

  canAny(...perms: Permission[]): boolean {
    return perms.some((p) => this.can(p));
  }
}
