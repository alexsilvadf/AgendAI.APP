import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RbacService } from '../../core/services/rbac.service';
import { ROLE_LABELS } from '../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rbac   = inject(RbacService);

  // ─── Estado reativo via signals ────────────────────────────────────────
  readonly isAuthenticated = computed(() => this.auth.isAuth$());
  readonly usuario         = computed(() => this.auth.user$());
  readonly menuOpen        = signal(false);

  readonly roleLabel = computed(() => {
    const role = this.auth.role$();
    return role ? ROLE_LABELS[role] : null;
  });

  // ─── Visibilidade dos links — recalculada ao trocar de role ───────────
  readonly isDentista           = computed(() => this.auth.role$() === 'dentista');
  readonly podeVerAgenda        = computed(() => this.rbac.can('agenda:view') && !this.isDentista());
  readonly podeAgendar          = computed(() => this.rbac.can('agendamento:create') && !this.isDentista());
  readonly podeAtender          = computed(() => this.rbac.can('atendimento:create'));
  readonly podeVerPacientes     = computed(() => this.rbac.can('pacientes:view') && !this.isDentista());
  readonly podeVerProcedimentos = computed(() => this.rbac.can('procedimentos:view') && !this.isDentista());
  readonly podeVerUsuarios      = computed(() => this.rbac.can('usuarios:view'));
  readonly podeVerFinanceiro    = computed(() => this.rbac.can('financeiro:view'));

  toggleMenu(): void { this.menuOpen.update((v) => !v); }
  closeMenu(): void  { this.menuOpen.set(false); }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
    void this.router.navigate(['/login']);
  }
}
