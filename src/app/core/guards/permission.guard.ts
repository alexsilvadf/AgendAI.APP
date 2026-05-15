import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { Permission } from '../models/user.model';
import { RbacService } from '../services/rbac.service';
import { AuthService } from '../services/auth.service';

/**
 * Guard de permissão RBAC.
 * Uso: canActivate: [authGuard, permissionGuard('usuarios:view')]
 */
export function permissionGuard(...required: Permission[]): CanActivateFn {
  return () => {
    const rbac   = inject(RbacService);
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (rbac.canAll(...required)) {
      return true;
    }

    // Dentista sem permissão vai para atendimento; demais para agenda
    const destino = auth.currentRole() === 'dentista' ? '/atendimento' : '/agenda';
    return router.createUrlTree([destino]);
  };
}
